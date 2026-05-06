// /api/v1/policies — manage per-profile governance rules.
// Auth: Supabase session cookie (createUserClient) — dashboard-first, mirrors agents pattern.

import { type NextRequest } from 'next/server'
import { createUserClient, createServiceRoleClient } from '@/lib/supabase-server'
import { invalidatePolicyCache } from '@/lib/policy-engine'

const VALID_CAPABILITY_FLAGS = new Set([
  'shell_exec', 'fs_write', 'net_egress', 'secret_read',
  'dynamic_eval', 'arbitrary_sql', 'process_spawn',
])
const VALID_TOOL_NAMES = new Set([
  'get_best_practices', 'get_latest_news', 'get_top_integrations', 'search_ecosystem',
  'find_mcp_servers', 'list_ecosystems', 'verify_payment_endpoint',
  'verify_agent_credential', 'track_data_flow',
])
const VALID_RISK_LEVELS = new Set(['low', 'medium', 'high', 'critical'])
const VALID_ACTIONS     = new Set(['block', 'warn'])

function bad(msg: string) { return Response.json({ error: msg }, { status: 400 }) }

interface PolicyBody {
  name?:                    unknown
  description?:             unknown
  action?:                  unknown
  enabled?:                 unknown
  match_capability_flags?:  unknown
  match_risk_level_gte?:    unknown
  match_tool_names?:        unknown
  time_start_hour?:         unknown
  time_end_hour?:           unknown
  agent_id?:                unknown
  priority?:                unknown
}

function validateBody(body: PolicyBody, requireCondition = true): string | null {
  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || !body.name.trim()) return 'name is required'
    if (body.name.trim().length > 80) return 'name must be ≤ 80 characters'
  }
  if (body.action !== undefined && !VALID_ACTIONS.has(body.action as string)) {
    return `action must be one of: ${[...VALID_ACTIONS].join(', ')}`
  }
  if (body.match_capability_flags !== undefined && body.match_capability_flags !== null) {
    if (!Array.isArray(body.match_capability_flags)) return 'match_capability_flags must be an array'
    for (const f of body.match_capability_flags as unknown[]) {
      if (typeof f !== 'string' || !VALID_CAPABILITY_FLAGS.has(f))
        return `unknown capability flag: ${String(f)}`
    }
  }
  if (body.match_risk_level_gte !== undefined && body.match_risk_level_gte !== null) {
    if (!VALID_RISK_LEVELS.has(body.match_risk_level_gte as string))
      return `match_risk_level_gte must be one of: ${[...VALID_RISK_LEVELS].join(', ')}`
  }
  if (body.match_tool_names !== undefined && body.match_tool_names !== null) {
    if (!Array.isArray(body.match_tool_names)) return 'match_tool_names must be an array'
    for (const t of body.match_tool_names as unknown[]) {
      if (typeof t !== 'string' || !VALID_TOOL_NAMES.has(t))
        return `unknown tool name: ${String(t)}`
    }
  }
  const sh = body.time_start_hour, eh = body.time_end_hour
  const hasSh = sh !== undefined && sh !== null, hasEh = eh !== undefined && eh !== null
  if (hasSh !== hasEh) return 'time_start_hour and time_end_hour must both be set or both absent'
  if (hasSh) {
    const s = Number(sh), e = Number(eh)
    if (!Number.isInteger(s) || s < 0 || s > 23) return 'time_start_hour must be 0–23'
    if (!Number.isInteger(e) || e < 0 || e > 23) return 'time_end_hour must be 0–23'
  }
  if (body.priority !== undefined && body.priority !== null) {
    const p = Number(body.priority)
    if (!Number.isInteger(p) || p < 1 || p > 1000) return 'priority must be an integer 1–1000'
  }
  if (requireCondition) {
    const hasCondition =
      (Array.isArray(body.match_capability_flags) && body.match_capability_flags.length > 0) ||
      (body.match_risk_level_gte != null) ||
      (Array.isArray(body.match_tool_names) && body.match_tool_names.length > 0) ||
      (hasSh && hasEh)
    if (!hasCondition) return 'at least one condition is required (capability flags, risk level, tool names, or time window)'
  }
  return null
}

// ── GET — list policies ───────────────────────────────────────────────────────

export async function GET() {
  const userClient = await createUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const sb = createServiceRoleClient()
  const { data, error } = await sb
    .from('policies')
    .select(
      'id, name, description, enabled, action, match_capability_flags, match_risk_level_gte, ' +
      'match_tool_names, time_start_hour, time_end_hour, agent_id, priority, created_at, updated_at'
    )
    .eq('profile_id', user.id)
    .order('priority', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[policies] list failed:', error.message)
    return Response.json({ error: 'Service error' }, { status: 503 })
  }

  return Response.json({ policies: data ?? [] })
}

// ── POST — create policy ──────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const userClient = await createUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  let body: PolicyBody
  try { body = await request.json() as PolicyBody } catch {
    return bad('Invalid JSON body')
  }

  if (typeof body.name !== 'string' || !body.name.trim()) return bad('name is required')
  if (!body.action || !VALID_ACTIONS.has(body.action as string)) return bad('action must be block or warn')

  const validErr = validateBody(body, true)
  if (validErr) return bad(validErr)

  const agentIdFinal = typeof body.agent_id === 'string' ? body.agent_id.trim() || null : null

  const sb = createServiceRoleClient()

  if (agentIdFinal) {
    const { data: ownsAgent } = await sb
      .from('agent_identities')
      .select('id')
      .eq('agent_id', agentIdFinal)
      .eq('profile_id', user.id)
      .maybeSingle()
    if (!ownsAgent) return bad('agent_id does not belong to this profile')
  }

  const { data, error } = await sb
    .from('policies')
    .insert({
      profile_id:             user.id,
      name:                   (body.name as string).trim(),
      description:            typeof body.description === 'string' ? body.description.trim() || null : null,
      enabled:                body.enabled !== false,
      action:                 body.action as string,
      match_capability_flags: Array.isArray(body.match_capability_flags) && (body.match_capability_flags as unknown[]).length > 0
                                ? body.match_capability_flags : null,
      match_risk_level_gte:   typeof body.match_risk_level_gte === 'string' ? body.match_risk_level_gte : null,
      match_tool_names:       Array.isArray(body.match_tool_names) && (body.match_tool_names as unknown[]).length > 0
                                ? body.match_tool_names : null,
      time_start_hour:        body.time_start_hour != null ? Number(body.time_start_hour) : null,
      time_end_hour:          body.time_end_hour   != null ? Number(body.time_end_hour)   : null,
      agent_id:               agentIdFinal,
      priority:               body.priority != null ? Number(body.priority) : 100,
    })
    .select()
    .single()

  if (error || !data) {
    console.error('[policies] insert failed:', error?.message)
    return Response.json({ error: 'Service error' }, { status: 503 })
  }

  invalidatePolicyCache(user.id)
  return Response.json(data, { status: 201 })
}
