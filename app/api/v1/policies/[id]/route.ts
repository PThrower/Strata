import { type NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { authenticateAny } from '@/lib/api-auth'
import { invalidatePolicyCache } from '@/lib/policy-engine'

type Params = { params: Promise<{ id: string }> }

function bad(msg: string) { return Response.json({ error: msg }, { status: 400 }) }

// ── PUT — full replace ────────────────────────────────────────────────────────

export async function PUT(request: NextRequest, { params }: Params) {
  const { id } = await params
  const auth = await authenticateAny(request)
  if (!auth.ok) return auth.response

  let body: Record<string, unknown>
  try { body = await request.json() as Record<string, unknown> } catch {
    return bad('Invalid JSON body')
  }

  if (typeof body.name !== 'string' || !(body.name as string).trim()) return bad('name is required')
  if (!body.action || !['block','warn'].includes(body.action as string)) return bad('action must be block or warn')

  const VALID_FLAGS   = new Set(['shell_exec','fs_write','net_egress','secret_read','dynamic_eval','arbitrary_sql','process_spawn'])
  const VALID_TOOLS   = new Set(['get_best_practices','get_latest_news','get_top_integrations','search_ecosystem','find_mcp_servers','list_ecosystems','verify_payment_endpoint','verify_agent_credential','track_data_flow'])
  const VALID_RISK    = new Set(['low','medium','high','critical'])

  if (body.match_capability_flags != null) {
    if (!Array.isArray(body.match_capability_flags)) return bad('match_capability_flags must be an array')
    for (const f of body.match_capability_flags as unknown[]) {
      if (typeof f !== 'string' || !VALID_FLAGS.has(f)) return bad(`unknown flag: ${String(f)}`)
    }
  }
  if (body.match_risk_level_gte != null && !VALID_RISK.has(body.match_risk_level_gte as string))
    return bad('invalid match_risk_level_gte')
  if (body.match_tool_names != null) {
    if (!Array.isArray(body.match_tool_names)) return bad('match_tool_names must be an array')
    for (const t of body.match_tool_names as unknown[]) {
      if (typeof t !== 'string' || !VALID_TOOLS.has(t)) return bad(`unknown tool: ${String(t)}`)
    }
  }
  const hasSh = body.time_start_hour != null, hasEh = body.time_end_hour != null
  if (hasSh !== hasEh) return bad('time_start_hour and time_end_hour must be set together')
  if (hasSh) {
    const s = Number(body.time_start_hour), e = Number(body.time_end_hour)
    if (!Number.isInteger(s) || s < 0 || s > 23 || !Number.isInteger(e) || e < 0 || e > 23)
      return bad('time hours must be 0–23')
  }
  const hasCondition =
    (Array.isArray(body.match_capability_flags) && (body.match_capability_flags as unknown[]).length > 0) ||
    body.match_risk_level_gte != null ||
    (Array.isArray(body.match_tool_names) && (body.match_tool_names as unknown[]).length > 0) ||
    (hasSh && hasEh)
  if (!hasCondition) return bad('at least one condition is required')

  const agentIdFinal = typeof body.agent_id === 'string' ? (body.agent_id as string).trim() || null : null

  const sb = createServiceRoleClient()
  const { data: existing } = await sb
    .from('policies').select('id').eq('id', id).eq('profile_id', auth.profileId).maybeSingle()
  if (!existing) return Response.json({ error: 'Not found' }, { status: 404 })

  if (agentIdFinal) {
    const { data: ownsAgent } = await sb
      .from('agent_identities')
      .select('id')
      .eq('agent_id', agentIdFinal)
      .eq('profile_id', auth.profileId)
      .maybeSingle()
    if (!ownsAgent) return bad('agent_id does not belong to this profile')
  }

  const { data, error } = await sb
    .from('policies')
    .update({
      name:                   (body.name as string).trim(),
      description:            typeof body.description === 'string' ? (body.description as string).trim() || null : null,
      enabled:                body.enabled !== false,
      action:                 body.action as string,
      match_capability_flags: Array.isArray(body.match_capability_flags) && (body.match_capability_flags as unknown[]).length > 0 ? body.match_capability_flags : null,
      match_risk_level_gte:   typeof body.match_risk_level_gte === 'string' ? body.match_risk_level_gte : null,
      match_tool_names:       Array.isArray(body.match_tool_names) && (body.match_tool_names as unknown[]).length > 0 ? body.match_tool_names : null,
      time_start_hour:        hasSh ? Number(body.time_start_hour) : null,
      time_end_hour:          hasEh ? Number(body.time_end_hour)   : null,
      agent_id:               agentIdFinal,
      priority:               body.priority != null ? Number(body.priority) : 100,
      updated_at:             new Date().toISOString(),
    })
    .eq('id', id).eq('profile_id', auth.profileId)
    .select()
    .single()

  if (error) {
    console.error('[policies] update failed:', error.message)
    return Response.json({ error: 'Service error' }, { status: 503 })
  }

  invalidatePolicyCache(auth.profileId)
  return Response.json(data)
}

// ── PATCH — partial update (primarily for enabled toggle) ────────────────────

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params
  const auth = await authenticateAny(request)
  if (!auth.ok) return auth.response

  let body: Record<string, unknown>
  try { body = await request.json() as Record<string, unknown> } catch {
    return bad('Invalid JSON body')
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if ('enabled' in body) {
    if (typeof body.enabled !== 'boolean') return bad('enabled must be a boolean')
    patch.enabled = body.enabled
  }
  if ('priority' in body && body.priority != null) {
    const p = Number(body.priority)
    if (!Number.isInteger(p) || p < 1 || p > 1000) return bad('priority must be 1–1000')
    patch.priority = p
  }
  if ('name' in body && body.name != null) {
    if (typeof body.name !== 'string' || !(body.name as string).trim()) return bad('name cannot be empty')
    patch.name = (body.name as string).trim()
  }

  if (Object.keys(patch).length === 1) return bad('no valid fields to update')

  const sb = createServiceRoleClient()
  const { data: existing } = await sb
    .from('policies').select('id').eq('id', id).eq('profile_id', auth.profileId).maybeSingle()
  if (!existing) return Response.json({ error: 'Not found' }, { status: 404 })

  const { data, error } = await sb
    .from('policies').update(patch).eq('id', id).eq('profile_id', auth.profileId).select().single()

  if (error) {
    console.error('[policies] patch failed:', error.message)
    return Response.json({ error: 'Service error' }, { status: 503 })
  }

  invalidatePolicyCache(auth.profileId)
  return Response.json(data)
}

// ── DELETE ────────────────────────────────────────────────────────────────────

export async function DELETE(request: NextRequest, { params }: Params) {
  const { id } = await params
  const auth = await authenticateAny(request)
  if (!auth.ok) return auth.response

  const sb = createServiceRoleClient()
  const { data: existing } = await sb
    .from('policies').select('id').eq('id', id).eq('profile_id', auth.profileId).maybeSingle()
  if (!existing) return Response.json({ error: 'Not found' }, { status: 404 })

  const { error } = await sb.from('policies').delete().eq('id', id).eq('profile_id', auth.profileId)
  if (error) {
    console.error('[policies] delete failed:', error.message)
    return Response.json({ error: 'Service error' }, { status: 503 })
  }

  invalidatePolicyCache(auth.profileId)
  return Response.json({ id, deleted: true })
}
