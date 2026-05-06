// POST   /api/v1/circuit-breakers/:server_id/reset  — create per-profile bypass
// DELETE /api/v1/circuit-breakers/:server_id/reset  — revoke per-profile bypass

import { type NextRequest } from 'next/server'
import { authenticateRequest } from '@/lib/api-auth'

type Params = { params: Promise<{ server_id: string }> }

export async function POST(request: NextRequest, { params }: Params) {
  const { server_id } = await params

  const auth = await authenticateRequest(request)
  if (!auth.ok) return auth.response

  // Verify the server exists and is circuit-broken
  const { data: server } = await auth.supabase
    .from('mcp_servers')
    .select('id, circuit_broken')
    .eq('id', server_id)
    .maybeSingle()

  if (!server) return Response.json({ error: 'Server not found' }, { status: 404 })
  if (!server.circuit_broken) return Response.json({ error: 'Circuit breaker is not tripped for this server' }, { status: 400 })

  let reset_reason: string | null = null
  try {
    const body = await request.json() as Record<string, unknown>
    if (typeof body.reason === 'string') reset_reason = body.reason.trim().slice(0, 500) || null
  } catch { /* body is optional */ }

  const { data, error } = await auth.supabase
    .from('circuit_breaker_resets')
    .upsert(
      {
        server_id,
        profile_id:   auth.profile.id,
        reset_at:     new Date().toISOString(),
        reset_reason,
      },
      { onConflict: 'server_id,profile_id' },
    )
    .select()
    .single()

  if (error) {
    console.error('[circuit-breakers] reset failed:', error.message)
    return Response.json({ error: 'Service error' }, { status: 503 })
  }

  return Response.json(data, { status: 201 })
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { server_id } = await params

  const auth = await authenticateRequest(_request)
  if (!auth.ok) return auth.response

  const { data: existing } = await auth.supabase
    .from('circuit_breaker_resets')
    .select('id')
    .eq('server_id', server_id)
    .eq('profile_id', auth.profile.id)
    .maybeSingle()

  if (!existing) return Response.json({ error: 'No reset found for this server' }, { status: 404 })

  const { error } = await auth.supabase
    .from('circuit_breaker_resets')
    .delete()
    .eq('server_id', server_id)
    .eq('profile_id', auth.profile.id)

  if (error) {
    console.error('[circuit-breakers] revoke failed:', error.message)
    return Response.json({ error: 'Service error' }, { status: 503 })
  }

  return Response.json({ server_id, deleted: true })
}
