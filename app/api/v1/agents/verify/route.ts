// Public-facing agent credential verification.
// No session auth required — this is called by MCP servers and x402 endpoints.
// Rate-limited per-IP via the shared allowIp() bucket from lib/api-auth.ts.

import { type NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { verifyCredential, isCredentialError } from '@/lib/agent-credentials'
import { allowIp } from '@/lib/api-auth'

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '0.0.0.0'
  if (!allowIp(ip)) {
    return Response.json({ error: 'Too many requests' }, { status: 429 })
  }

  let credential: string
  try {
    const body = await request.json() as { credential?: unknown }
    if (typeof body.credential !== 'string' || !body.credential) {
      return Response.json({ error: 'credential is required' }, { status: 400 })
    }
    credential = body.credential
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Verify signature and decode claims.
  const result = await verifyCredential(credential)
  if (isCredentialError(result)) {
    return Response.json({ valid: false, error: result.error, message: result.message }, { status: 200 })
  }

  // Live revocation check.
  const sb = createServiceRoleClient()
  const { data: identity, error: dbErr } = await sb
    .from('agent_identities')
    .select('id, revoked_at, revocation_reason, expires_at')
    .eq('id', result.jti)
    .maybeSingle<{ id: string; revoked_at: string | null; revocation_reason: string | null; expires_at: string }>()

  if (dbErr) {
    console.error('[agents/verify] db lookup failed:', dbErr.message)
    return Response.json({ error: 'Service error' }, { status: 503 })
  }

  // jti not found means the identity was hard-deleted (rare) or the JWT is forged.
  if (!identity) {
    return Response.json({ valid: false, error: 'not_found', message: 'identity record not found' })
  }

  if (identity.revoked_at) {
    return Response.json({
      valid:    false,
      error:    'revoked',
      message:  identity.revocation_reason ?? 'credential has been revoked',
      revoked_at: identity.revoked_at,
    })
  }

  // Bump last_verified_at (fire-and-forget; non-fatal if it fails).
  void sb
    .from('agent_identities')
    .update({ last_verified_at: new Date().toISOString() })
    .eq('id', identity.id)

  return Response.json({
    valid:        true,
    agent_id:     result.agentId,
    profile_id:   result.profileId,
    name:         result.name,
    capabilities: result.capabilities,
    expires_at:   result.expiresAt,
  })
}
