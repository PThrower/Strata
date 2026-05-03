import { createHmac } from 'crypto'
import type { NextRequest } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createServiceRoleClient } from './supabase-server'

// ── Audit hash helper (H-6/M-1) ─────────────────────────────────────────────
// Requires AUDIT_HASH_PEPPER to be set in env. Without it, hashes are HMAC
// with an empty key — better than raw SHA-256 but lacks per-installation entropy.
const AUDIT_HASH_PEPPER = process.env.AUDIT_HASH_PEPPER ?? ''
if (!AUDIT_HASH_PEPPER) {
  console.warn('[api-auth] AUDIT_HASH_PEPPER not set — audit hashes lack per-installation pepper. Add to .env.local and Vercel env vars.')
}

function hashForAudit(value: string): string {
  return createHmac('sha256', AUDIT_HASH_PEPPER).update(value).digest('hex')
}

// ── Ecosystem slug validation (H-5) ─────────────────────────────────────────
const SLUG_RE = /^[a-z0-9][a-z0-9_-]{0,63}$/

// M-6: identical response for both not-found and tier-denied so callers cannot
// enumerate which pro-only slugs exist.
const ecosystemBlocked = () =>
  Response.json({ error: 'Ecosystem not available', upgrade_url: '/dashboard' }, { status: 403 })

// ── Per-IP token bucket (M-7) ────────────────────────────────────────────────
// Per-process sliding window. In serverless / Fluid Compute each instance has
// independent state — this bounds abuse within one instance. For global
// enforcement across all instances add @upstash/ratelimit or a WAF rule.
const IP_WINDOW_MS = 60_000
const IP_MAX_REQS = 200
const ipWindows = new Map<string, { n: number; reset: number }>()

export function allowIp(ip: string): boolean {
  const now = Date.now()
  if (ipWindows.size > 10_000) {
    for (const [k, v] of ipWindows) {
      if (v.reset <= now) ipWindows.delete(k)
    }
  }
  const w = ipWindows.get(ip)
  if (!w || w.reset <= now) {
    ipWindows.set(ip, { n: 1, reset: now + IP_WINDOW_MS })
    return true
  }
  if (w.n >= IP_MAX_REQS) return false
  w.n++
  return true
}

// ── Query-param truncation (M-5) ─────────────────────────────────────────────
function truncateQueryParams(params: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(params).map(([k, v]) => [
      k,
      typeof v === 'string' && v.length > 256 ? v.slice(0, 256) + '…' : v,
    ])
  )
}

// ── Types ────────────────────────────────────────────────────────────────────

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

// ── Auth functions ────────────────────────────────────────────────────────────

// Atomically validates the API key, rolls the monthly window if elapsed,
// enforces the tier limit, and increments the counter — all in a single
// SECURITY DEFINER Postgres function under row-level locking. Returns either
// the authenticated profile or a Response to short-circuit the route.
export async function authenticateRequest(req: NextRequest): Promise<AuthResult> {
  // M-7: per-IP rate limit before hitting the DB
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? ''
  if (ip && !allowIp(ip)) {
    return {
      ok: false,
      response: Response.json({ error: 'Too many requests' }, { status: 429 }),
    }
  }

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

  // L-2: use the RPC's authoritative tier rather than the hydrated profile's.
  // The profile SELECT happens after the rate-limit check; a Stripe webhook
  // firing between the two calls could leave profile.tier stale.
  return { ok: true, profile: { ...profile, tier: data.tier as Tier }, supabase }
}

// Verifies the requested ecosystem exists and that the caller's tier is
// permitted to use it. Free tier users are blocked from ecosystems where
// available_on_free = false.
export async function checkEcosystemAccess(
  supabase: ServiceClient,
  ecosystemSlug: string,
  tier: Tier,
): Promise<{ ok: true; slug: string } | { ok: false; response: Response }> {
  // H-5: validate slug format before touching the DB. The old .or() approach
  // used string interpolation which allowed PostgREST filter-syntax injection.
  // M-6: use the same 403 as access-denied to prevent tier enumeration.
  if (!SLUG_RE.test(ecosystemSlug)) {
    return { ok: false, response: ecosystemBlocked() }
  }

  // Two fully-parameterised queries instead of a single .or(`...${slug}...`).
  type EcoRow = { slug: string; available_on_free: boolean }

  const { data: bySlug } = await supabase
    .from('ecosystems')
    .select('slug, available_on_free')
    .eq('slug', ecosystemSlug)
    .maybeSingle<EcoRow>()

  let ecosystem: EcoRow | null = bySlug
  if (!ecosystem) {
    const { data: byAlias } = await supabase
      .from('ecosystems')
      .select('slug, available_on_free')
      .contains('aliases', [ecosystemSlug])
      .maybeSingle<EcoRow>()
    ecosystem = byAlias
  }

  // M-6: identical response for not-found and tier-denied
  if (!ecosystem || (tier === 'free' && !ecosystem.available_on_free)) {
    return { ok: false, response: ecosystemBlocked() }
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
    api_key_hash: hashForAudit(args.apiKey),
    tool_name: args.tool,
    // M-5: truncate any string query param longer than 256 chars before storing
    query_params: args.queryParams ? truncateQueryParams(args.queryParams) : null,
    result_count: args.resultCount ?? null,
    result_ids: args.resultIds && args.resultIds.length > 0 ? args.resultIds : null,
    client_ip_hash: args.clientIp ? hashForAudit(args.clientIp) : null,
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

// ── Anonymous tier (SDK + Action friction-reducer) ──────────────────────────
// Headerless callers get a 10-req/hour rolling window per IP. Best-effort
// (per-instance) rather than strict — abuse-resistant enough for a free tier
// that exists primarily to let developers try the SDK without signing up.
const ANON_WINDOW_MS = 60 * 60 * 1000
const ANON_MAX_REQS = 10
const anonWindows = new Map<string, { n: number; reset: number }>()

function consumeAnonQuota(ip: string): { allowed: boolean; remaining: number; resetAt: Date } {
  const now = Date.now()
  if (anonWindows.size > 10_000) {
    for (const [k, v] of anonWindows) {
      if (v.reset <= now) anonWindows.delete(k)
    }
  }
  const w = anonWindows.get(ip)
  if (!w || w.reset <= now) {
    anonWindows.set(ip, { n: 1, reset: now + ANON_WINDOW_MS })
    return { allowed: true, remaining: ANON_MAX_REQS - 1, resetAt: new Date(now + ANON_WINDOW_MS) }
  }
  if (w.n >= ANON_MAX_REQS) {
    return { allowed: false, remaining: 0, resetAt: new Date(w.reset) }
  }
  w.n++
  return { allowed: true, remaining: ANON_MAX_REQS - w.n, resetAt: new Date(w.reset) }
}

export type AnonAuth = {
  ok: true
  mode: 'anon'
  ip: string
  remaining: number
  resetAt: Date
}

export type ProfileAuth = {
  ok: true
  mode: 'auth'
  profile: Profile
  supabase: ServiceClient
}

export type AuthOrAnon = AnonAuth | ProfileAuth | { ok: false; response: Response }

// Accepts either `Authorization: Bearer <key>` or `X-API-Key: <key>` —
// missing both → anon path. Routes branch on result.mode to skip per-key
// logging in anon mode.
export async function authenticateOrAnon(req: NextRequest): Promise<AuthOrAnon> {
  const headerKey = req.headers.get('x-api-key')
  const bearer = req.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1]
  const apiKey = headerKey ?? bearer ?? null

  if (apiKey) {
    // Reuse the existing IP token bucket + key consumption flow.
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? ''
    if (ip && !allowIp(ip)) {
      return {
        ok: false,
        response: Response.json({ error: 'Too many requests' }, { status: 429 }),
      }
    }
    const result = await consumeApiCall(apiKey)
    if (!result.ok) return { ok: false, response: result.response }
    return { ok: true, mode: 'auth', profile: result.profile, supabase: result.supabase }
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '0.0.0.0'
  const quota = consumeAnonQuota(ip)
  if (!quota.allowed) {
    return {
      ok: false,
      response: Response.json(
        {
          error: 'rate_limited',
          message: 'Anonymous limit is 10 req/hour. Add Authorization header for higher limits.',
          reset_at: quota.resetAt.toISOString(),
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': String(ANON_MAX_REQS),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': quota.resetAt.toISOString(),
          },
        },
      ),
    }
  }
  return { ok: true, mode: 'anon', ip, remaining: quota.remaining, resetAt: quota.resetAt }
}

export function rateLimitHeaders(auth: AnonAuth | ProfileAuth): Record<string, string> {
  if (auth.mode === 'anon') {
    return {
      'X-RateLimit-Limit': String(ANON_MAX_REQS),
      'X-RateLimit-Remaining': String(auth.remaining),
      'X-RateLimit-Reset': auth.resetAt.toISOString(),
    }
  }
  const limit = auth.profile.tier === 'pro' ? PRO_LIMIT : FREE_LIMIT
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': String(limit),
    'X-RateLimit-Remaining': String(Math.max(0, limit - auth.profile.calls_used)),
  }
  if (auth.profile.calls_reset_at) headers['X-RateLimit-Reset'] = auth.profile.calls_reset_at
  return headers
}
