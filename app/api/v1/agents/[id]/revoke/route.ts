import { type NextRequest } from 'next/server'
import { createUserClient, createServiceRoleClient } from '@/lib/supabase-server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  const userClient = await createUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  let reason: string | null = null
  try {
    const body = await request.json() as { reason?: unknown }
    if (typeof body.reason === 'string' && body.reason.trim()) {
      reason = body.reason.trim().slice(0, 200)
    }
  } catch { /* reason stays null */ }

  const sb = createServiceRoleClient()

  // Verify ownership before revoking.
  const { data: existing } = await sb
    .from('agent_identities')
    .select('id, revoked_at')
    .eq('id', id)
    .eq('profile_id', user.id)
    .maybeSingle<{ id: string; revoked_at: string | null }>()

  if (!existing) return Response.json({ error: 'Not found' }, { status: 404 })

  // Idempotent: already revoked is fine.
  if (existing.revoked_at) {
    return Response.json({ id, revoked_at: existing.revoked_at, message: 'Already revoked' })
  }

  const revokedAt = new Date().toISOString()
  const { error } = await sb
    .from('agent_identities')
    .update({ revoked_at: revokedAt, revocation_reason: reason })
    .eq('id', id)

  if (error) {
    console.error('[agents/revoke] update failed:', error.message)
    return Response.json({ error: 'Service error' }, { status: 503 })
  }

  return Response.json({ id, revoked_at: revokedAt })
}
