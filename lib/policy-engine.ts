// Policy engine — evaluates per-profile rules against a tool call context.
// Called from lib/mcp-tools.ts (hard enforcement) and app/api/v1/mcp/verify
// (advisory signal). Fails open on DB errors — policy failures must never
// silently block legitimate traffic.

import type { ServiceClient } from './api-auth'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PolicyContext {
  profileId:              string
  agentId?:               string | null      // from X-Agent-Id header
  toolName:               string             // Strata MCP tool name
  serverCapabilityFlags?: string[]           // server's capability_flags when available
  serverRiskLevel?:       string | null      // computed risk level when available
  serverUrl?:             string | null      // server URL when available
}

export type WarnResult = {
  rule_id:   string
  rule_name: string
  reason:    string
}

export type PolicyDecision =
  | { allowed: true;  warnings: WarnResult[] }
  | { allowed: false; rule_id: string; rule_name: string; reason: string }

type PolicyRow = {
  id:                     string
  name:                   string
  enabled:                boolean
  action:                 'block' | 'warn'
  match_capability_flags: string[] | null
  match_risk_level_gte:   string | null
  match_tool_names:       string[] | null
  match_server_url_glob:  string | null     // reserved — not evaluated in v1
  time_start_hour:        number | null
  time_end_hour:          number | null
  agent_id:               string | null
  priority:               number
}

// ── Risk ordering ─────────────────────────────────────────────────────────────

const RISK_ORDER: Record<string, number> = {
  low: 0, medium: 1, high: 2, critical: 3,
}

function meetsRiskThreshold(serverLevel: string | null | undefined, minLevel: string): boolean {
  if (!serverLevel) return false
  return (RISK_ORDER[serverLevel] ?? -1) >= (RISK_ORDER[minLevel] ?? -1)
}

// ── Time window ───────────────────────────────────────────────────────────────

function inTimeWindow(startHour: number, endHour: number): boolean {
  const h = new Date().getUTCHours()
  // Overnight window when start > end (e.g. 23–06 means 23:xx–05:59)
  return startHour <= endHour
    ? h >= startHour && h < endHour
    : h >= startHour || h < endHour
}

// ── Per-condition matching (AND logic across non-null fields) ─────────────────

function policyMatches(policy: PolicyRow, ctx: PolicyContext): boolean {
  // Agent scope: rule applies only to the specified agent (or all if null)
  if (policy.agent_id !== null && policy.agent_id !== (ctx.agentId ?? null)) return false

  // Capability flags: server must have at least one of the listed flags
  if (policy.match_capability_flags && policy.match_capability_flags.length > 0) {
    const serverFlags = ctx.serverCapabilityFlags ?? []
    if (!policy.match_capability_flags.some(f => serverFlags.includes(f))) return false
  }

  // Risk level: server risk must meet or exceed the threshold
  if (policy.match_risk_level_gte !== null) {
    if (!meetsRiskThreshold(ctx.serverRiskLevel, policy.match_risk_level_gte)) return false
  }

  // Tool names: the calling tool must be in the list
  if (policy.match_tool_names && policy.match_tool_names.length > 0) {
    if (!policy.match_tool_names.includes(ctx.toolName)) return false
  }

  // Time window
  if (policy.time_start_hour !== null && policy.time_end_hour !== null) {
    if (!inTimeWindow(policy.time_start_hour, policy.time_end_hour)) return false
  }

  // match_server_url_glob is reserved — not evaluated in v1

  return true
}

function buildReason(policy: PolicyRow, ctx: PolicyContext): string {
  const parts: string[] = [`Rule "${policy.name}"`]
  if (policy.match_capability_flags?.length) {
    const matched = (policy.match_capability_flags).filter(
      f => (ctx.serverCapabilityFlags ?? []).includes(f)
    )
    const display = matched.length > 0 ? matched : policy.match_capability_flags
    parts.push(`server capability: ${display.join(', ')}`)
  }
  if (policy.match_risk_level_gte) {
    parts.push(`risk level ${ctx.serverRiskLevel ?? '?'} ≥ ${policy.match_risk_level_gte}`)
  }
  if (policy.match_tool_names?.length) {
    parts.push(`tool "${ctx.toolName}" is restricted`)
  }
  if (policy.time_start_hour !== null && policy.time_end_hour !== null) {
    parts.push(`blocked ${String(policy.time_start_hour).padStart(2,'0')}:00–${String(policy.time_end_hour).padStart(2,'0')}:00 UTC`)
  }
  if (policy.agent_id) {
    parts.push(`agent ${policy.agent_id.slice(0, 12)}…`)
  }
  return parts.join(' — ')
}

// ── Policy cache (per-instance, 30s TTL) ──────────────────────────────────────

const CACHE_TTL_MS = 30_000

type CacheEntry = { policies: PolicyRow[]; loadedAt: number }
const policyCache = new Map<string, CacheEntry>()

async function loadPolicies(supabase: ServiceClient, profileId: string): Promise<PolicyRow[]> {
  const cached = policyCache.get(profileId)
  if (cached && Date.now() - cached.loadedAt < CACHE_TTL_MS) return cached.policies

  const { data } = await supabase
    .from('policies')
    .select(
      'id, name, enabled, action, match_capability_flags, match_risk_level_gte, ' +
      'match_tool_names, match_server_url_glob, time_start_hour, time_end_hour, agent_id, priority'
    )
    .eq('profile_id', profileId)
    .eq('enabled', true)
    .order('priority', { ascending: true })
    .order('created_at', { ascending: true })

  const policies = (data ?? []) as unknown as PolicyRow[]
  policyCache.set(profileId, { policies, loadedAt: Date.now() })
  return policies
}

// Call after create/update/delete to ensure next evaluation reads fresh data.
export function invalidatePolicyCache(profileId: string): void {
  policyCache.delete(profileId)
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function evaluatePolicy(
  supabase: ServiceClient,
  ctx: PolicyContext,
): Promise<PolicyDecision> {
  try {
    const policies = await loadPolicies(supabase, ctx.profileId)
    const warnings: WarnResult[] = []

    for (const policy of policies) {
      if (!policyMatches(policy, ctx)) continue

      const reason = buildReason(policy, ctx)

      if (policy.action === 'block') {
        return { allowed: false, rule_id: policy.id, rule_name: policy.name, reason }
      }

      // 'warn' — record but continue (a later block can still fire)
      warnings.push({ rule_id: policy.id, rule_name: policy.name, reason })
    }

    return { allowed: true, warnings }
  } catch {
    // Fail open — a policy DB error must never silently deny legitimate traffic
    console.error('[policy-engine] evaluation failed, failing open')
    return { allowed: true, warnings: [] }
  }
}
