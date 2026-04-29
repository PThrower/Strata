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

// Steps 1-7 of the auth pipeline: read header, lookup profile, reset window if
// elapsed, enforce monthly limit, increment counter. Returns either the
// authenticated profile or a Response to short-circuit the route.
export async function authenticateRequest(req: NextRequest): Promise<AuthResult> {
  const apiKey = req.headers.get('x-api-key')
  if (!apiKey) {
    return invalidKey()
  }

  const supabase = createServiceRoleClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('api_key', apiKey)
    .maybeSingle<Profile>()

  if (!profile) {
    return invalidKey()
  }

  const now = new Date()
  const resetAt = profile.calls_reset_at ? new Date(profile.calls_reset_at) : null

  if (resetAt === null || resetAt <= now) {
    const newResetAt = new Date(now)
    newResetAt.setMonth(newResetAt.getMonth() + 1)
    await supabase
      .from('profiles')
      .update({ calls_used: 0, calls_reset_at: newResetAt.toISOString() })
      .eq('id', profile.id)
    profile.calls_used = 0
    profile.calls_reset_at = newResetAt.toISOString()
  }

  const limit = profile.tier === 'pro' ? PRO_LIMIT : FREE_LIMIT
  if (profile.calls_used >= limit) {
    return {
      ok: false,
      response: Response.json(
        { error: 'Monthly limit reached', tier: profile.tier },
        { status: 429 },
      ),
    }
  }

  await supabase
    .from('profiles')
    .update({ calls_used: profile.calls_used + 1 })
    .eq('id', profile.id)
  profile.calls_used += 1

  return { ok: true, profile, supabase }
}

// Verifies the requested ecosystem exists and that the caller's tier is
// permitted to use it. Free tier users are blocked from ecosystems where
// available_on_free = false.
export async function checkEcosystemAccess(
  supabase: ServiceClient,
  ecosystemSlug: string,
  tier: Tier,
): Promise<{ ok: true } | { ok: false; response: Response }> {
  const { data: ecosystem } = await supabase
    .from('ecosystems')
    .select('available_on_free')
    .eq('slug', ecosystemSlug)
    .maybeSingle<{ available_on_free: boolean }>()

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

  return { ok: true }
}

export async function logApiRequest(
  supabase: ServiceClient,
  args: { apiKey: string; tool: string; ecosystem: string; statusCode: number },
) {
  await supabase.from('api_requests').insert({
    api_key: args.apiKey,
    tool: args.tool,
    ecosystem: args.ecosystem,
    status_code: args.statusCode,
  })
}

function invalidKey(): AuthFailure {
  return {
    ok: false,
    response: Response.json({ error: 'Invalid API key' }, { status: 401 }),
  }
}
