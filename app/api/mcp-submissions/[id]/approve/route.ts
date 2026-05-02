import { type NextRequest } from 'next/server'
import { createUserClient, createServiceRoleClient } from '@/lib/supabase-server'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userClient = await createUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  const adminEmail = process.env.ADMIN_EMAIL
  if (!user || !adminEmail || user.email !== adminEmail) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const supabase = createServiceRoleClient()

  const { data: server } = await supabase
    .from('mcp_servers')
    .select('id, score_status')
    .eq('id', id)
    .maybeSingle<{ id: string; score_status: string | null }>()

  if (!server) return Response.json({ error: 'Not found' }, { status: 404 })
  if (server.score_status !== 'pending_review') {
    return Response.json({ error: 'Submission is not pending review' }, { status: 400 })
  }

  await supabase
    .from('mcp_servers')
    .update({ score_status: 'scored', updated_at: new Date().toISOString() })
    .eq('id', id)

  return Response.json({ success: true })
}
