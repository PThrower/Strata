// Dependency graph assembly — shared by the API route and the dashboard page.
// Both consumers supply a service-role Supabase client + a profile_id.

import type { ServiceClient } from './api-auth'
import { computeRiskLevel } from './risk'

// ── Public types ──────────────────────────────────────────────────────────────

export interface GraphThreat {
  event_type:  string
  severity:    string
  detail:      string | null
  created_at:  string
}

export interface GraphNode {
  url:                   string
  name:                  string
  in_directory:          boolean
  security_score:        number | null
  runtime_score:         number | null
  risk_level:            string
  capability_flags:      string[]
  is_quarantined:        boolean
  circuit_broken:        boolean
  circuit_broken_reason: string | null
  has_profile_reset:     boolean
  call_count:            number
  last_seen_at:          string
  recent_threats:        GraphThreat[]
  policy_blocked:        boolean
  category:              string | null
}

export interface GraphEdge {
  source_url:          string
  dest_url:            string
  flow_count:          number
  data_tags:           string[]
  dest_has_net_egress: boolean
  risk_level:          string
  last_flow_at:        string
  session_count:       number
}

export interface DependencyGraph {
  nodes:       GraphNode[]
  edges:       GraphEdge[]
  summary: {
    total_nodes:          number
    total_edges:          number
    risk_distribution:    Record<string, number>
    circuit_broken_count: number
    quarantined_count:    number
    policy_blocked_count: number
    no_edges:               boolean
    period_days:            number | null
    total_count_before_cap: number   // total unique URLs before 50-node cap
  }
  generated_at: string
}

// ── Internal helpers ──────────────────────────────────────────────────────────

const RISK_ORDER: Record<string, number> = { unknown: -1, low: 0, medium: 1, high: 2, critical: 3 }

function higherRisk(a: string, b: string): string {
  return (RISK_ORDER[a] ?? -1) >= (RISK_ORDER[b] ?? -1) ? a : b
}

type PolicyRow = { match_capability_flags: string[] | null; match_risk_level_gte: string | null }

// AND semantics matching lib/policy-engine.ts policyMatches — all non-null conditions
// must pass for the policy to fire. OR semantics would produce false positives for
// combined-condition rules (e.g. match_capability_flags + match_risk_level_gte both set).
// Simplifications vs live engine: match_tool_names, time windows, and agent_id are
// not evaluated here — the graph is a server-centric view, not a per-call view.
function isBlocked(riskLevel: string, flags: string[], policies: PolicyRow[]): boolean {
  outer: for (const p of policies) {
    if (p.match_capability_flags?.length) {
      if (!p.match_capability_flags.some(f => flags.includes(f))) continue outer
    }
    if (p.match_risk_level_gte) {
      const nodeR = RISK_ORDER[riskLevel] ?? -1
      const minR  = RISK_ORDER[p.match_risk_level_gte] ?? -1
      if (nodeR < 0 || nodeR < minR) continue outer
    }
    // Policy has no server-side conditions we can evaluate — skip it.
    if (!p.match_capability_flags?.length && !p.match_risk_level_gte) continue outer
    return true
  }
  return false
}

function safeHostname(url: string): string {
  try { return new URL(url).hostname } catch { return url }
}

// Exported so client components can guard <a href> against javascript:/data:/etc URLs.
export function safeHttpHref(url: string | null | undefined): string | undefined {
  if (!url) return undefined
  try {
    const u = new URL(url)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return undefined
    return u.toString()
  } catch {
    return undefined
  }
}

// ── Assembly ──────────────────────────────────────────────────────────────────

const MAX_NODES       = 50
const MAX_LEDGER      = 1000
const MAX_LINEAGE     = 1000
const THREATS_WINDOW  = 7 * 86_400_000
const MAX_THREATS_PER_NODE = 5

export async function assembleDepGraph(
  supabase: ServiceClient,
  profileId: string,
  periodDays: number | null,
): Promise<DependencyGraph> {
  const since         = periodDays ? new Date(Date.now() - periodDays * 86_400_000).toISOString() : null
  const sevenDaysAgo  = new Date(Date.now() - THREATS_WINDOW).toISOString()

  // ── Round 1: ledger + lineage + block policies (parallel) ─────────────────

  let ledgerQ = supabase
    .from('agent_activity_ledger')
    .select('server_url, created_at')
    .eq('profile_id', profileId)
    .not('server_url', 'is', null)
    .order('created_at', { ascending: false })
    .limit(MAX_LEDGER)
  if (since) ledgerQ = ledgerQ.gte('created_at', since)

  let lineageQ = supabase
    .from('data_lineage_flows')
    .select('source_server_url, dest_server_url, data_tags, dest_has_net_egress, risk_level, session_id, created_at')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false })
    .limit(MAX_LINEAGE)
  if (since) lineageQ = lineageQ.gte('created_at', since)

  const [{ data: ledgerRows }, { data: lineageRows }, { data: policyRows }] = await Promise.all([
    ledgerQ,
    lineageQ,
    supabase
      .from('policies')
      .select('match_capability_flags, match_risk_level_gte')
      .eq('profile_id', profileId)
      .eq('enabled', true)
      .eq('action', 'block'),
  ])

  // ── Build node seen-map from ledger ───────────────────────────────────────

  const nodeSeenAt = new Map<string, { count: number; last_seen_at: string }>()
  for (const row of (ledgerRows ?? []) as { server_url: string; created_at: string }[]) {
    const e = nodeSeenAt.get(row.server_url)
    if (!e) {
      nodeSeenAt.set(row.server_url, { count: 1, last_seen_at: row.created_at })
    } else {
      e.count++
      if (row.created_at > e.last_seen_at) e.last_seen_at = row.created_at
    }
  }

  // ── Build edge map + track lineage node URLs ──────────────────────────────

  type EdgeAccum = {
    flow_count: number
    data_tags: Set<string>
    dest_has_net_egress: boolean
    risk_level: string
    last_flow_at: string
    sessions: Set<string>
  }
  const edgeMap = new Map<string, EdgeAccum>()
  const lineageLastSeen = new Map<string, string>()
  const lineageNodeUrls = new Set<string>()

  for (const f of (lineageRows ?? []) as {
    source_server_url: string; dest_server_url: string
    data_tags: string[] | null; dest_has_net_egress: boolean | null
    risk_level: string | null; session_id: string | null; created_at: string
  }[]) {
    lineageNodeUrls.add(f.source_server_url)
    lineageNodeUrls.add(f.dest_server_url)

    for (const u of [f.source_server_url, f.dest_server_url]) {
      const t = lineageLastSeen.get(u)
      if (!t || f.created_at > t) lineageLastSeen.set(u, f.created_at)
    }

    const key = `${f.source_server_url}\0${f.dest_server_url}`
    const e = edgeMap.get(key)
    const flowRisk = f.risk_level ?? 'unknown'
    if (!e) {
      edgeMap.set(key, {
        flow_count:          1,
        data_tags:           new Set(f.data_tags ?? []),
        dest_has_net_egress: f.dest_has_net_egress === true,
        risk_level:          flowRisk,
        last_flow_at:        f.created_at,
        sessions:            new Set(f.session_id ? [f.session_id] : []),
      })
    } else {
      e.flow_count++
      for (const tag of (f.data_tags ?? [])) e.data_tags.add(tag)
      if (f.dest_has_net_egress) e.dest_has_net_egress = true
      e.risk_level = higherRisk(e.risk_level, flowRisk)
      if (f.created_at > e.last_flow_at) e.last_flow_at = f.created_at
      if (f.session_id) e.sessions.add(f.session_id)
    }
  }

  // ── Collect unique URLs ───────────────────────────────────────────────────

  const allUrls = new Set([...nodeSeenAt.keys(), ...lineageNodeUrls])
  const totalCountBeforeCap = allUrls.size

  if (allUrls.size === 0) {
    return {
      nodes: [], edges: [],
      summary: { total_nodes: 0, total_edges: 0, risk_distribution: {}, circuit_broken_count: 0, quarantined_count: 0, policy_blocked_count: 0, no_edges: true, period_days: periodDays, total_count_before_cap: 0 },
      generated_at: new Date().toISOString(),
    }
  }

  // Fetch enrichment for ALL urls first so we can sort by risk before capping.
  // Only then apply the MAX_NODES limit — ensures critical/circuit-broken servers
  // survive the cap even if they were less recently seen.

  // ── Round 2: enrich from mcp_servers ─────────────────────────────────────

  const { data: mcpRows } = await supabase
    .from('mcp_servers')
    .select('id, name, url, security_score, runtime_score, capability_flags, is_quarantined, circuit_broken, circuit_broken_reason, category')
    .in('url', [...allUrls])

  type McpEnriched = {
    id: string; name: string; url: string
    security_score: number | null; runtime_score: number | null
    capability_flags: string[] | null; is_quarantined: boolean | null
    circuit_broken: boolean; circuit_broken_reason: string | null; category: string | null
  }
  const mcpByUrl = new Map<string, McpEnriched>()
  for (const r of (mcpRows ?? []) as McpEnriched[]) mcpByUrl.set(r.url, r)

  // ── Risk-first sort + cap ─────────────────────────────────────────────────
  // Sort by: risk_level DESC, circuit_broken DESC, last_seen_at DESC.
  // Guarantees critical/circuit-broken servers survive the cap.

  const urlRiskOrder: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1, unknown: 0 }

  function urlRisk(url: string): number {
    const mcp = mcpByUrl.get(url)
    if (!mcp) return 0
    const level = computeRiskLevel({
      is_quarantined:   mcp.is_quarantined,
      security_score:   mcp.security_score,
      capability_flags: mcp.capability_flags,
    }).level
    return urlRiskOrder[level] ?? 0
  }

  const sortedUrls = [...allUrls].sort((a, b) => {
    const riskDiff = urlRisk(b) - urlRisk(a)
    if (riskDiff !== 0) return riskDiff
    const cbA = mcpByUrl.get(a)?.circuit_broken ? 1 : 0
    const cbB = mcpByUrl.get(b)?.circuit_broken ? 1 : 0
    if (cbA !== cbB) return cbB - cbA
    const ta = nodeSeenAt.get(a)?.last_seen_at ?? lineageLastSeen.get(a) ?? ''
    const tb = nodeSeenAt.get(b)?.last_seen_at ?? lineageLastSeen.get(b) ?? ''
    return tb.localeCompare(ta)
  }).slice(0, MAX_NODES)

  const urlSet = new Set(sortedUrls)

  const mcpIds = (mcpRows ?? [])
    .filter((r: { url: string }) => urlSet.has(r.url))
    .map((r: { id: string }) => r.id)

  // ── Round 3: circuit_breaker_resets + threat_feed (parallel) ─────────────

  let resetSet = new Set<string>()
  const threatsByServerId = new Map<string, GraphThreat[]>()

  if (mcpIds.length > 0) {
    const [{ data: resets }, { data: threatRows }] = await Promise.all([
      supabase
        .from('circuit_breaker_resets')
        .select('server_id')
        .eq('profile_id', profileId)
        .in('server_id', mcpIds),
      supabase
        .from('threat_feed')
        .select('server_id, event_type, severity, detail, created_at')
        .in('server_id', mcpIds)
        .gte('created_at', sevenDaysAgo)
        .order('created_at', { ascending: false })
        .limit(200),
    ])

    resetSet = new Set((resets ?? []).map((r: { server_id: string }) => r.server_id))

    for (const t of (threatRows ?? []) as { server_id: string; event_type: string; severity: string; detail: string | null; created_at: string }[]) {
      const list = threatsByServerId.get(t.server_id) ?? []
      if (list.length < MAX_THREATS_PER_NODE) list.push({ event_type: t.event_type, severity: t.severity, detail: t.detail, created_at: t.created_at })
      threatsByServerId.set(t.server_id, list)
    }
  }

  // ── Assemble nodes ────────────────────────────────────────────────────────

  const policies = (policyRows ?? []) as PolicyRow[]
  const nodes: GraphNode[] = []

  for (const url of sortedUrls) {
    const mcp      = mcpByUrl.get(url)
    const seenData = nodeSeenAt.get(url)
    const flags    = mcp?.capability_flags ?? []

    let riskLevel = 'unknown'
    if (mcp) {
      riskLevel = computeRiskLevel({
        is_quarantined:   mcp.is_quarantined,
        security_score:   mcp.security_score,
        capability_flags: mcp.capability_flags,
      }).level
    }

    nodes.push({
      url,
      name:                  mcp?.name ?? safeHostname(url),
      in_directory:          !!mcp,
      security_score:        mcp?.security_score    ?? null,
      runtime_score:         mcp?.runtime_score     ?? null,
      risk_level:            riskLevel,
      capability_flags:      flags,
      is_quarantined:        mcp?.is_quarantined === true,
      circuit_broken:        mcp?.circuit_broken === true,
      circuit_broken_reason: mcp?.circuit_broken_reason ?? null,
      has_profile_reset:     mcp ? resetSet.has(mcp.id) : false,
      call_count:            seenData?.count ?? 0,
      last_seen_at:          seenData?.last_seen_at ?? lineageLastSeen.get(url) ?? new Date(0).toISOString(),
      recent_threats:        mcp ? (threatsByServerId.get(mcp.id) ?? []) : [],
      policy_blocked:        isBlocked(riskLevel, flags, policies),
      category:              mcp?.category ?? null,
    })
  }

  // ── Assemble edges ────────────────────────────────────────────────────────

  const edges: GraphEdge[] = []
  for (const [key, e] of edgeMap) {
    const [sourceUrl, destUrl] = key.split('\0')
    if (!urlSet.has(sourceUrl) || !urlSet.has(destUrl)) continue
    edges.push({
      source_url:          sourceUrl,
      dest_url:            destUrl,
      flow_count:          e.flow_count,
      data_tags:           [...e.data_tags],
      dest_has_net_egress: e.dest_has_net_egress,
      risk_level:          e.risk_level,
      last_flow_at:        e.last_flow_at,
      session_count:       e.sessions.size,
    })
  }

  // ── Summary ───────────────────────────────────────────────────────────────

  const riskDist: Record<string, number> = {}
  for (const n of nodes) riskDist[n.risk_level] = (riskDist[n.risk_level] ?? 0) + 1

  return {
    nodes,
    edges,
    summary: {
      total_nodes:          nodes.length,
      total_edges:          edges.length,
      risk_distribution:    riskDist,
      circuit_broken_count: nodes.filter(n => n.circuit_broken).length,
      quarantined_count:    nodes.filter(n => n.is_quarantined).length,
      policy_blocked_count: nodes.filter(n => n.policy_blocked).length,
      no_edges:               edges.length === 0,
      period_days:            periodDays,
      total_count_before_cap: totalCountBeforeCap,
    },
    generated_at: new Date().toISOString(),
  }
}
