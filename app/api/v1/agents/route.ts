// /api/v1/agents — customer-facing agent identity management.
// Auth: Supabase session cookie (createUserClient). Calls from the dashboard
// pick up the cookie automatically; programmatic callers pass the cookie.

import { randomBytes } from 'crypto'
import { type NextRequest } from 'next/server'
import { createUserClient, createServiceRoleClient } from '@/lib/supabase-server'
import { signCredential } from '@/lib/agent-credentials'

const MAX_NAME_LENGTH       = 80
const MAX_DESCRIPTION_LENGTH = 500
const MAX_EXPIRES_DAYS      = 5 * 365   // hard cap: 5 years
const DEFAULT_EXPIRES_DAYS  = 365
const ALLOWED_CAPABILITIES  = new Set(['mcp:invoke', 'x402:pay'])

interface CreateBody {
  name?:             unknown
  description?:      unknown
  capabilities?:     unknown
  expires_in_days?:  unknown
  metadata?:         unknown
}

function generateAgentId(): string {
  return 'agt_' + randomBytes(16).toString('hex')
}

function badRequest(message: string): Response {
  return Response.json({ error: message }, { status: 400 })
}

export async function POST(request: NextRequest) {
  const userClient = await createUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  let body: CreateBody
  try {
    body = (await request.json()) as CreateBody
  } catch {
    return badRequest('Invalid JSON body')
  }

  // ── Validate name ──────────────────────────────────────────────────────────
  if (typeof body.name !== 'string' || body.name.trim().length === 0) {
    return badRequest('name is required')
  }
  const name = body.name.trim()
  if (name.length > MAX_NAME_LENGTH) {
    return badRequest(`name must be ${MAX_NAME_LENGTH} characters or fewer`)
  }

  // ── Validate description ───────────────────────────────────────────────────
  let description: string | null = null
  if (body.description !== undefined && body.description !== null && body.description !== '') {
    if (typeof body.description !== 'string') return badRequest('description must be a string')
    if (body.description.length > MAX_DESCRIPTION_LENGTH) {
      return badRequest(`description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer`)
    }
    description = body.description
  }

  // ── Validate capabilities ──────────────────────────────────────────────────
  let capabilities: string[] = []
  if (body.capabilities !== undefined) {
    if (!Array.isArray(body.capabilities)) return badRequest('capabilities must be an array')
    for (const c of body.capabilities) {
      if (typeof c !== 'string' || !ALLOWED_CAPABILITIES.has(c)) {
        return badRequest(`unknown capability: ${String(c)}. Allowed: ${[...ALLOWED_CAPABILITIES].join(', ')}`)
      }
    }
    capabilities = Array.from(new Set(body.capabilities as string[]))
  }

  // ── Validate expires_in_days ──────────────────────────────────────────────
  let expiresInDays = DEFAULT_EXPIRES_DAYS
  if (body.expires_in_days !== undefined && body.expires_in_days !== null) {
    const n = typeof body.expires_in_days === 'number' ? body.expires_in_days : Number(body.expires_in_days)
    if (!Number.isFinite(n) || n <= 0 || n > MAX_EXPIRES_DAYS || !Number.isInteger(n)) {
      return badRequest(`expires_in_days must be a positive integer ≤ ${MAX_EXPIRES_DAYS}`)
    }
    expiresInDays = n
  }

  // ── Validate metadata ─────────────────────────────────────────────────────
  let metadata: Record<string, unknown> | null = null
  if (body.metadata !== undefined && body.metadata !== null) {
    if (typeof body.metadata !== 'object' || Array.isArray(body.metadata)) {
      return badRequest('metadata must be a JSON object')
    }
    metadata = body.metadata as Record<string, unknown>
  }

  // ── Insert ────────────────────────────────────────────────────────────────
  const sb         = createServiceRoleClient()
  const agentId    = generateAgentId()
  const now        = new Date()
  const expiresAt  = new Date(now.getTime() + expiresInDays * 86_400_000)

  const { data, error } = await sb
    .from('agent_identities')
    .insert({
      profile_id:   user.id,
      agent_id:     agentId,
      name,
      description,
      capabilities,
      metadata,
      expires_at:   expiresAt.toISOString(),
    })
    .select('id, agent_id, name, description, capabilities, metadata, created_at, expires_at')
    .single<{
      id:          string
      agent_id:    string
      name:        string
      description: string | null
      capabilities: string[]
      metadata:    Record<string, unknown> | null
      created_at:  string
      expires_at:  string
    }>()

  if (error || !data) {
    console.error('[agents] insert failed:', error?.message)
    return Response.json({ error: 'Service error' }, { status: 503 })
  }

  // ── Sign the credential ───────────────────────────────────────────────────
  let credential: string
  try {
    credential = await signCredential({
      id:           data.id,
      agentId:      data.agent_id,
      profileId:    user.id,
      name:         data.name,
      capabilities: data.capabilities,
      createdAt:    new Date(data.created_at),
      expiresAt:    new Date(data.expires_at),
    })
  } catch (err) {
    console.error('[agents] signing failed:', err)
    // Roll back the insert so we don't leave an orphan identity with no JWT.
    await sb.from('agent_identities').delete().eq('id', data.id)
    return Response.json(
      { error: 'Signing key not configured. Set STRATA_AGENT_SIGNING_KEY.' },
      { status: 503 },
    )
  }

  return Response.json({
    id:           data.id,
    agent_id:     data.agent_id,
    name:         data.name,
    description:  data.description,
    capabilities: data.capabilities,
    metadata:     data.metadata,
    created_at:   data.created_at,
    expires_at:   data.expires_at,
    credential,                              // shown ONCE — never stored, never re-derivable
  }, { status: 201 })
}

export async function GET() {
  const userClient = await createUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const sb = createServiceRoleClient()
  const { data, error } = await sb
    .from('agent_identities')
    .select('id, agent_id, name, description, capabilities, metadata, created_at, expires_at, last_verified_at, revoked_at, revocation_reason')
    .eq('profile_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[agents] list failed:', error.message)
    return Response.json({ error: 'Service error' }, { status: 503 })
  }

  return Response.json({ agents: data ?? [] })
}
