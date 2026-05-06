// GET /api/v1/lineage/sessions — distinct sessions with aggregate stats.
// Calls the get_lineage_sessions(profile_id) Postgres RPC.

import { type NextRequest } from 'next/server'
import { authenticateRequest, logApiRequest } from '@/lib/api-auth'
import { serverTiming } from '@/lib/server-timing'

export async function GET(request: NextRequest) {
  const t0 = Date.now()

  const auth = await authenticateRequest(request)
  if (!auth.ok) return auth.response

  const { data, error } = await auth.supabase
    .rpc('get_lineage_sessions', { p_profile_id: auth.profile.id })

  if (error) {
    console.error('[lineage/sessions] rpc failed:', error.message)
    return Response.json({ error: 'Service error' }, { status: 503 })
  }

  await logApiRequest(auth.supabase, {
    apiKey: auth.profile.api_key,
    tool: 'lineage-sessions',
    ecosystem: 'lineage',
    statusCode: 200,
  })

  return Response.json(
    { sessions: data ?? [] },
    { headers: { 'Server-Timing': serverTiming(t0) } },
  )
}
