import { createHash } from 'crypto'
import type { NextRequest } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createServiceRoleClient } from './supabase-server'

export type Tier = 'free' | 'pro'

export type Profile = {
  id: string
  email: string
  api_key: string
  tier: Tier
  calls_used: number
  calls_reset_at: string | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  created_at: string
}

export type ServiceClient = SupabaseClient

export const FREE_LIMIT = 100
export const PRO_LIMIT = 10_000

type AuthSuccess = { ok: true; profile: Profile; supabase: ServiceClient }
type AuthFailure = { ok: false; response: Response }
export type AuthResult = AuthSuccess | AuthFailure

type ConsumeResult = {
  allowed: boolean
  profile_id: string | null
  tier: Tier | null
  calls_used: number
  was_reset: boolean
}

// Atomically validates the API key, rolls the monthly window if elapsed,
// enforces the tier limit, and increments the counter — all in a single
// SECURITY DEFINER Postgres function under row-level locking. Returns either
// the authenticated profile or a Response to short-circuit the route.
export async function authenticateRequest(req: NextRequest): Promise<AuthResult> {
  const apiKey = req.headers.get('x-api-key')
  if (!apiKey) return invalidKey()
  return consumeApiCall(apiKey)
}

export async function consumeApiCall(apiKey: string): Promise<AuthResult> {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .rpc('consume_api_call', { input_api_key: apiKey })
    .maybeSingle<ConsumeResult>()

  if (error || !data) {
    return {
      ok: false,
      response: Response.json({ error: 'Service error' }, { status: 503 }),
    }
  }

  if (!data.profile_id) return invalidKey()

  if (!data.allowed) {
    return {
      ok: false,
      response: Response.json(
        { error: 'Monthly limit reached', tier: data.tier },
        { status: 429 },
      ),
    }
  }

  // Hydrate the rest of the profile fields the routes expect.
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.profile_id)
    .maybeSingle<Profile>()

  if (profileErr || !profile) {
    return {
      ok: false,
      response: Response.json({ error: 'Service error' }, { status: 503 }),
    }
  }

  return { ok: true, profile, supabase }
}

// Verifies the requested ecosystem exists and that the caller's tier is
// permitted to use it. Free tier users are blocked from ecosystems where
// available_on_free = false.
export async function checkEcosystemAccess(
  supabase: ServiceClient,
  ecosystemSlug: string,
  tier: Tier,
): Promise<{ ok: true; slug: string } | { ok: false; response: Response }> {
  const { data: ecosystem } = await supabase
    .from('ecosystems')
    .select('slug, available_on_free')
    .or(`slug.eq.${ecosystemSlug},aliases.cs.{${ecosystemSlug}}`)
    .maybeSingle<{ slug: string; available_on_free: boolean }>()

  if (!ecosystem) {
    return {
      ok: false,
      response: Response.json({ error: 'Ecosystem not found' }, { status: 404 }),
    }
  }

  if (tier === 'free' && !ecosystem.available_on_free) {
    return {
      ok: false,
      response: Response.json(
        { error: 'Ecosystem not available on free tier', upgrade_url: '/dashboard' },
        { status: 403 },
      ),
    }
  }

  return { ok: true, slug: ecosystem.slug }
}

export async function logApiRequest(
  supabase: ServiceClient,
  args: { apiKey: string; tool: string; ecosystem: string; statusCode: number },
) {
  const { error } = await supabase.from('api_requests').insert({
    api_key: args.apiKey,
    tool: args.tool,
    ecosystem: args.ecosystem,
    status_code: args.statusCode,
  })
  if (error) {
    console.error('[api_requests] insert failed:', error.message)
  }
}

export async function logQueryAudit(
  supabase: ServiceClient,
  args: {
    apiKey: string
    tool: string
    queryParams?: Record<string, unknown>
    resultIds?: string[]
    resultCount?: number
    statusCode: number
    clientIp?: string | null
    latencyMs?: number
  },
) {
  const { error } = await supabase.from('api_query_log').insert({
    api_key_hash: createHash('sha256').update(args.apiKey).digest('hex'),
    tool_name: args.tool,
    query_params: args.queryParams ?? null,
    result_count: args.resultCount ?? null,
    result_ids: args.resultIds && args.resultIds.length > 0 ? args.resultIds : null,
    client_ip_hash: args.clientIp
      ? createHash('sha256').update(args.clientIp).digest('hex')
      : null,
    status_code: args.statusCode,
    latency_ms: args.latencyMs ?? null,
  })
  if (error) {
    console.error('[api_query_log] insert failed:', error.message)
  }
}

function invalidKey(): AuthFailure {
  return {
    ok: false,
    response: Response.json({ error: 'Invalid API key' }, { status: 401 }),
  }
}
