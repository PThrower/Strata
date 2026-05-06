// GET /api/v1/anomalies — list behavioral anomaly events for the authenticated profile.

import { type NextRequest } from 'next/server'
import { authenticateRequest, logApiRequest } from '@/lib/api-auth'
import { serverTiming } from '@/lib/server-timing'

const DEFAULT_DAYS  = 30
const DEFAULT_LIMIT = 50
const MAX_LIMIT     = 200
const VALID_SEVERITIES = new Set(['critical', 'high', 'medium', 'low'])

export async function GET(request: NextRequest) {
  const t0 = Date.now()

  const auth = await authenticateRequest(request)
  if (!auth.ok) return auth.response

  const sp = request.nextUrl.searchParams

  const rawLimit  = parseInt(sp.get('limit') ?? String(DEFAULT_LIMIT), 10)
  const limit     = Math.max(1, Math.min(MAX_LIMIT, Number.isFinite(rawLimit) ? rawLimit : DEFAULT_LIMIT))
  const sinceRaw  = sp.get('since')
  const beforeRaw = sp.get('before')
  const sevRaw    = sp.get('severity')
  const ackRaw    = sp.get('acknowledged')

  if (sevRaw && !VALID_SEVERITIES.has(sevRaw)) {
    return Response.json({ error: 'severity must be critical, high, medium, or low' }, { status: 400 })
  }

  const sinceDate = sinceRaw && !isNaN(Date.parse(sinceRaw))
    ? new Date(sinceRaw).toISOString()
    : new Date(Date.now() - DEFAULT_DAYS * 86_400_000).toISOString()

  let query = auth.supabase
    .from('anomaly_events')
    .select(
      'id, event_type, severity, current_value, baseline_value, multiplier, detail, ' +
      'window_start, window_end, affected_server_urls, acknowledged, acknowledged_at, ' +
      'acknowledged_reason, created_at, agent_id',
      { count: 'exact' },
    )
    .eq('profile_id', auth.profile.id)
    .gte('created_at', sinceDate)
    .order('created_at', { ascending: false })
    .limit(limit + 1)

  if (sevRaw)              query = query.eq('severity', sevRaw)
  if (ackRaw === 'false')  query = query.eq('acknowledged', false)
  if (ackRaw === 'true')   query = query.eq('acknowledged', true)
  if (beforeRaw && !isNaN(Date.parse(beforeRaw))) {
    query = query.lt('created_at', new Date(beforeRaw).toISOString())
  }

  const { data, count, error } = await query
  if (error) {
    console.error('[anomalies] query failed:', error.message)
    return Response.json({ error: 'Service error' }, { status: 503 })
  }

  const events   = (data ?? []).slice(0, limit)
  const hasMore  = (data ?? []).length > limit
  const latestAt = events.length > 0 ? (events[0] as unknown as Record<string, unknown>).created_at as string : null

  await logApiRequest(auth.supabase, {
    apiKey: auth.profile.api_key, tool: 'anomalies', ecosystem: 'anomalies', statusCode: 200,
  })

  return Response.json(
    { events, total: count ?? 0, has_more: hasMore, latest_at: latestAt },
    { headers: { 'Server-Timing': serverTiming(t0) } },
  )
}
