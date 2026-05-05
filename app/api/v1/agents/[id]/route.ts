import { type NextRequest } from 'next/server'
import { createUserClient, createServiceRoleClient } from '@/lib/supabase-server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  const userClient = await createUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const sb = createServiceRoleClient()
  const { data, error } = await sb
    .from('agent_identities')
    .select('id, agent_id, name, description, capabilities, metadata, created_at, expires_at, last_verified_at, revoked_at, revocation_reason')
    .eq('id', id)
    .eq('profile_id', user.id)   // ownership check
    .maybeSingle()

  if (error) {
    console.error('[agents/id] select failed:', error.message)
    return Response.json({ error: 'Service error' }, { status: 503 })
  }
  if (!data) return Response.json({ error: 'Not found' }, { status: 404 })

  return Response.json(data)
}
