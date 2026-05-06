// POST /api/v1/anomalies/:id/acknowledge — mark an anomaly event as acknowledged.

import { type NextRequest } from 'next/server'
import { authenticateRequest } from '@/lib/api-auth'

type Params = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params

  const auth = await authenticateRequest(request)
  if (!auth.ok) return auth.response

  let reason: string | null = null
  try {
    const body = await request.json() as Record<string, unknown>
    if (typeof body.reason === 'string') reason = body.reason.trim().slice(0, 500) || null
  } catch { /* body is optional */ }

  // Verify ownership and current state
  const { data: existing } = await auth.supabase
    .from('anomaly_events')
    .select('id, acknowledged')
    .eq('id', id)
    .eq('profile_id', auth.profile.id)
    .maybeSingle()

  if (!existing) return Response.json({ error: 'Not found' }, { status: 404 })
  if (existing.acknowledged) return Response.json({ error: 'Already acknowledged' }, { status: 400 })

  const { error } = await auth.supabase
    .from('anomaly_events')
    .update({
      acknowledged:        true,
      acknowledged_at:     new Date().toISOString(),
      acknowledged_reason: reason,
    })
    .eq('id', id)
    .eq('profile_id', auth.profile.id)

  if (error) {
    console.error('[anomalies] acknowledge failed:', error.message)
    return Response.json({ error: 'Service error' }, { status: 503 })
  }

  return Response.json({ id, acknowledged: true })
}
