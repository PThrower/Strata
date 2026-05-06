// /api/v1/lineage — record and list data lineage flows.
// Auth: API key (authenticateRequest — same as all /api/v1/* routes).

import { type NextRequest } from 'next/server'
import {
  authenticateRequest,
  logApiRequest,
  logQueryAudit,
  type ServiceClient,
} from '@/lib/api-auth'
import { computeLineageRisk, VALID_DATA_TAGS } from '@/lib/lineage'
import { serverTiming } from '@/lib/server-timing'

const MAX_LIMIT          = 200
const DEFAULT_LIMIT      = 50
const MAX_TAG_COUNT      = 10
const MAX_LEDGER_IDS     = 50
const MAX_TOOL_NAME_LEN  = 120

const TOOL = 'lineage'

// ── Helpers ───────────────────────────────────────────────────────────────────

function badRequest(msg: string) {
  return Response.json({ error: msg }, { status: 400 })
}

function validateHttpsUrl(raw: unknown, field: string): { url: string } | Response {
  if (typeof raw !== 'string' || !raw.trim()) return badRequest(`${field} is required`)
  let parsed: URL
  try { parsed = new URL(raw.trim()) } catch { return badRequest(`${field}: invalid URL`) }
  if (parsed.protocol !== 'https:') return badRequest(`${field}: must be https`)
  return { url: parsed.toString() }
}

// Look up mcp_servers by hosted_endpoint or url (GitHub). Returns null if not found.
async function resolveMcpServer(supabase: ServiceClient, serverUrl: string) {
  // Try hosted_endpoint match first (exact), then url match.
  const { data: byEndpoint } = await supabase
    .from('mcp_servers')
    .select('id, capability_flags, is_quarantined')
    .eq('hosted_endpoint', serverUrl)
    .limit(1)
    .maybeSingle<{ id: string; capability_flags: string[] | null; is_quarantined: boolean | null }>()
  if (byEndpoint) return byEndpoint

  const { data: byUrl } = await supabase
    .from('mcp_servers')
    .select('id, capability_flags, is_quarantined')
    .eq('url', serverUrl)
    .limit(1)
    .maybeSingle<{ id: string; capability_flags: string[] | null; is_quarantined: boolean | null }>()
  return byUrl ?? null
}

// ── POST — record a flow ──────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const t0 = Date.now()
  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null

  const auth = await authenticateRequest(request)
  if (!auth.ok) return auth.response

  let body: Record<string, unknown>
  try { body = await request.json() as Record<string, unknown> } catch {
    return badRequest('Invalid JSON body')
  }

  // ── Validate required fields ───────────────────────────────────────────────
  const sourceResult = validateHttpsUrl(body.source_server, 'source_server')
  if (sourceResult instanceof Response) return sourceResult
  const sourceUrl = sourceResult.url

  const destResult = validateHttpsUrl(body.dest_server, 'dest_server')
  if (destResult instanceof Response) return destResult
  const destUrl = destResult.url

  if (sourceUrl === destUrl) return badRequest('source_server and dest_server must be different')

  // ── Validate optional fields ──────────────────────────────────────────────
  const agentId = typeof body.agent_id === 'string' ? body.agent_id.slice(0, 60) : null

  const sessionId = typeof body.session_id === 'string' ? body.session_id.trim().slice(0, 200) : null

  const sourceTool = typeof body.source_tool === 'string' ? body.source_tool.trim().slice(0, MAX_TOOL_NAME_LEN) : null
  const destTool   = typeof body.dest_tool   === 'string' ? body.dest_tool.trim().slice(0, MAX_TOOL_NAME_LEN)   : null

  let dataTags: string[] = []
  if (body.data_tags !== undefined) {
    if (!Array.isArray(body.data_tags)) return badRequest('data_tags must be an array')
    if (body.data_tags.length > MAX_TAG_COUNT) return badRequest(`data_tags may have at most ${MAX_TAG_COUNT} entries`)
    for (const t of body.data_tags) {
      if (typeof t !== 'string' || !VALID_DATA_TAGS.has(t)) {
        return badRequest(`unknown data_tag: "${String(t)}". Allowed: ${[...VALID_DATA_TAGS].join(', ')}`)
      }
    }
    dataTags = Array.from(new Set(body.data_tags as string[]))
  }

  let ledgerEntryIds: string[] | null = null
  if (body.ledger_entry_ids !== undefined) {
    if (!Array.isArray(body.ledger_entry_ids)) return badRequest('ledger_entry_ids must be an array')
    if (body.ledger_entry_ids.length > MAX_LEDGER_IDS) {
      return badRequest(`ledger_entry_ids may have at most ${MAX_LEDGER_IDS} entries`)
    }
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    for (const id of body.ledger_entry_ids) {
      if (typeof id !== 'string' || !uuidRe.test(id)) return badRequest('ledger_entry_ids must be UUIDs')
    }
    ledgerEntryIds = body.ledger_entry_ids as string[]
  }

  // ── Resolve mcp_servers (parallel) ────────────────────────────────────────
  const [sourceMcp, destMcp] = await Promise.all([
    resolveMcpServer(auth.supabase, sourceUrl),
    resolveMcpServer(auth.supabase, destUrl),
  ])

  const sourceFlags = sourceMcp?.capability_flags ?? []
  const destFlags   = destMcp?.capability_flags   ?? []
  const destHasNetEgress    = destFlags.includes('net_egress')
  const isDestQuarantined   = destMcp?.is_quarantined === true

  const riskLevel = computeLineageRisk(destFlags, dataTags, isDestQuarantined)

  // ── Insert ─────────────────────────────────────────────────────────────────
  const { data, error } = await auth.supabase
    .from('data_lineage_flows')
    .insert({
      profile_id:              auth.profile.id,
      agent_id:                agentId,
      session_id:              sessionId,
      source_server_url:       sourceUrl,
      source_tool:             sourceTool,
      source_mcp_server_id:    sourceMcp?.id ?? null,
      dest_server_url:         destUrl,
      dest_tool:               destTool,
      dest_mcp_server_id:      destMcp?.id ?? null,
      source_capability_flags: sourceFlags.length > 0 ? sourceFlags : null,
      dest_capability_flags:   destFlags.length   > 0 ? destFlags   : null,
      dest_has_net_egress:     destHasNetEgress,
      data_tags:               dataTags.length > 0 ? dataTags : null,
      risk_level:              riskLevel,
      ledger_entry_ids:        ledgerEntryIds,
    })
    .select()
    .single()

  if (error || !data) {
    console.error('[lineage] insert failed:', error?.message)
    return Response.json({ error: 'Service error' }, { status: 503 })
  }

  await logApiRequest(auth.supabase, { apiKey: auth.profile.api_key, tool: TOOL, ecosystem: 'lineage', statusCode: 201 })
  void logQueryAudit(auth.supabase, {
    apiKey: auth.profile.api_key,
    tool: TOOL,
    queryParams: { source_server: sourceUrl, dest_server: destUrl, session_id: sessionId },
    resultIds: [(data as unknown as { id: string }).id],
    resultCount: 1,
    statusCode: 201,
    clientIp,
    latencyMs: Date.now() - t0,
  })

  return Response.json(data, {
    status: 201,
    headers: { 'Server-Timing': serverTiming(t0) },
  })
}

// ── GET — list flows ──────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const t0 = Date.now()
  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null

  const auth = await authenticateRequest(request)
  if (!auth.ok) return auth.response

  const sp = request.nextUrl.searchParams

  const rawLimit = parseInt(sp.get('limit') ?? String(DEFAULT_LIMIT), 10)
  const limit = Math.max(1, Math.min(MAX_LIMIT, Number.isFinite(rawLimit) ? rawLimit : DEFAULT_LIMIT))

  const sessionId    = sp.get('session_id') ?? null
  const agentId      = sp.get('agent_id')   ?? null
  const riskLevel    = sp.get('risk_level') ?? null
  const egressOnly   = sp.get('dest_has_net_egress') === 'true'
  const before       = sp.get('before') ?? null   // ISO timestamp cursor

  let query = auth.supabase
    .from('data_lineage_flows')
    .select(
      'id, agent_id, session_id, source_server_url, source_tool, dest_server_url, dest_tool, ' +
      'source_capability_flags, dest_capability_flags, dest_has_net_egress, ' +
      'data_tags, risk_level, ledger_entry_ids, created_at',
      { count: 'exact' },
    )
    .eq('profile_id', auth.profile.id)
    .order('created_at', { ascending: false })
    .limit(limit + 1)   // fetch one extra to determine has_more

  if (sessionId) query = query.eq('session_id', sessionId)
  if (agentId)   query = query.eq('agent_id', agentId)
  if (riskLevel && ['low','medium','high','critical'].includes(riskLevel)) {
    query = query.eq('risk_level', riskLevel)
  }
  if (egressOnly) query = query.eq('dest_has_net_egress', true)
  if (before) {
    try { query = query.lt('created_at', new Date(before).toISOString()) } catch { /* ignore bad cursor */ }
  }

  const { data, count, error } = await query
  if (error) {
    console.error('[lineage] list failed:', error.message)
    return Response.json({ error: 'Service error' }, { status: 503 })
  }

  const flows   = (data ?? []).slice(0, limit)
  const hasMore = (data ?? []).length > limit

  await logApiRequest(auth.supabase, { apiKey: auth.profile.api_key, tool: TOOL, ecosystem: 'lineage', statusCode: 200 })
  void logQueryAudit(auth.supabase, {
    apiKey: auth.profile.api_key,
    tool: TOOL,
    queryParams: Object.fromEntries(sp.entries()),
    resultIds: flows.map(f => (f as unknown as { id: string }).id),
    resultCount: flows.length,
    statusCode: 200,
    clientIp,
    latencyMs: Date.now() - t0,
  })

  return Response.json(
    { flows, total: count ?? 0, has_more: hasMore },
    { headers: { 'Server-Timing': serverTiming(t0) } },
  )
}
