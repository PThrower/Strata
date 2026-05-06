// GET /api/v1/circuit-breakers — list all currently tripped circuit breakers.
// Includes the caller's per-profile reset status for each server.

import { type NextRequest } from 'next/server'
import { authenticateRequest, logApiRequest } from '@/lib/api-auth'
import { serverTiming } from '@/lib/server-timing'

const DEFAULT_LIMIT = 50
const MAX_LIMIT     = 200

export async function GET(request: NextRequest) {
  const t0 = Date.now()

  const auth = await authenticateRequest(request)
  if (!auth.ok) return auth.response

  const sp       = request.nextUrl.searchParams
  const rawLimit = parseInt(sp.get('limit') ?? String(DEFAULT_LIMIT), 10)
  const limit    = Math.max(1, Math.min(MAX_LIMIT, Number.isFinite(rawLimit) ? rawLimit : DEFAULT_LIMIT))

  const { data: servers, error } = await auth.supabase
    .from('mcp_servers')
    .select('id, name, url, circuit_broken_at, circuit_broken_reason', { count: 'exact' })
    .eq('circuit_broken', true)
    .order('circuit_broken_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[circuit-breakers] list failed:', error.message)
    return Response.json({ error: 'Service error' }, { status: 503 })
  }

  const serverIds = (servers ?? []).map((s: { id: string }) => s.id)

  // Fetch caller's resets for these servers in one query
  let resetSet = new Set<string>()
  if (serverIds.length > 0) {
    const { data: resets } = await auth.supabase
      .from('circuit_breaker_resets')
      .select('server_id')
      .eq('profile_id', auth.profile.id)
      .in('server_id', serverIds)
    resetSet = new Set((resets ?? []).map((r: { server_id: string }) => r.server_id))
  }

  const breakers = (servers ?? []).map((s: { id: string; name: string; url: string | null; circuit_broken_at: string; circuit_broken_reason: string | null }) => ({
    server_id:    s.id,
    server_name:  s.name,
    server_url:   s.url,
    tripped_at:   s.circuit_broken_at,
    reason:       s.circuit_broken_reason,
    profile_reset: resetSet.has(s.id),
  }))

  await logApiRequest(auth.supabase, {
    apiKey: auth.profile.api_key, tool: 'circuit-breakers', ecosystem: 'mcp', statusCode: 200,
  })

  return Response.json(
    { breakers, total: breakers.length },
    { headers: { 'Server-Timing': serverTiming(t0) } },
  )
}
