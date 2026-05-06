// Real-time threat feed — changes to MCP server risk signals.
// Written by a Postgres trigger on mcp_servers; this route reads only.

import { type NextRequest } from 'next/server'
import {
  authenticateRequest,
  logApiRequest,
} from '@/lib/api-auth'
import { serverTiming } from '@/lib/server-timing'

const DEFAULT_DAYS  = 7
const DEFAULT_LIMIT = 50
const MAX_LIMIT     = 200
const VALID_SEVERITIES = new Set(['critical', 'high', 'medium', 'low'])

export async function GET(request: NextRequest) {
  const t0 = Date.now()

  const auth = await authenticateRequest(request)
  if (!auth.ok) return auth.response

  const sp = request.nextUrl.searchParams

  // ── Parse params ─────────────────────────────────────────────────────────────
  const rawLimit = parseInt(sp.get('limit') ?? String(DEFAULT_LIMIT), 10)
  const limit    = Math.max(1, Math.min(MAX_LIMIT, Number.isFinite(rawLimit) ? rawLimit : DEFAULT_LIMIT))

  const sinceRaw     = sp.get('since')
  const beforeRaw    = sp.get('before')
  const severityRaw  = sp.get('severity')
  const serverIdRaw  = sp.get('server_id')
  const affectedOnly = sp.get('affected_only') === 'true'

  // Default since: 7 days ago
  const sinceDate = sinceRaw && !isNaN(Date.parse(sinceRaw))
    ? new Date(sinceRaw).toISOString()
    : new Date(Date.now() - DEFAULT_DAYS * 86_400_000).toISOString()

  if (severityRaw && !VALID_SEVERITIES.has(severityRaw)) {
    return Response.json({ error: 'severity must be critical, high, medium, or low' }, { status: 400 })
  }

  // ── Optional: affected_only filter ───────────────────────────────────────────
  // Fetch distinct server_url values from the caller's ledger, then filter feed.
  let affectedUrls: string[] | null = null
  if (affectedOnly) {
    const { data: ledgerRows } = await auth.supabase
      .from('agent_activity_ledger')
      .select('server_url')
      .eq('profile_id', auth.profile.id)
      .not('server_url', 'is', null)
    affectedUrls = [...new Set((ledgerRows ?? []).map((r: { server_url: string }) => r.server_url).filter(Boolean))]
    // If the user has no ledger entries, return empty feed immediately
    if (affectedUrls.length === 0) {
      return Response.json(
        { events: [], total: 0, has_more: false, latest_at: null },
        { headers: { 'Server-Timing': serverTiming(t0) } },
      )
    }
  }

  // ── Query threat_feed ─────────────────────────────────────────────────────────
  let query = auth.supabase
    .from('threat_feed')
    .select('id, server_id, server_url, server_name, event_type, severity, old_value, new_value, detail, created_at', { count: 'exact' })
    .gte('created_at', sinceDate)
    .order('created_at', { ascending: false })
    .limit(limit + 1)

  if (severityRaw)  query = query.eq('severity', severityRaw)
  if (serverIdRaw)  query = query.eq('server_id', serverIdRaw)
  if (beforeRaw && !isNaN(Date.parse(beforeRaw))) {
    query = query.lt('created_at', new Date(beforeRaw).toISOString())
  }
  if (affectedUrls && affectedUrls.length > 0) {
    query = query.in('server_url', affectedUrls)
  }

  const { data, count, error } = await query
  if (error) {
    console.error('[threats] query failed:', error.message)
    return Response.json({ error: 'Service error' }, { status: 503 })
  }

  const events  = (data ?? []).slice(0, limit)
  const hasMore = (data ?? []).length > limit
  const latestAt = events.length > 0 ? events[0].created_at as string : null

  await logApiRequest(auth.supabase, { apiKey: auth.profile.api_key, tool: 'threats', ecosystem: 'threats', statusCode: 200 })

  return Response.json(
    { events, total: count ?? 0, has_more: hasMore, latest_at: latestAt },
    { headers: { 'Server-Timing': serverTiming(t0) } },
  )
}
