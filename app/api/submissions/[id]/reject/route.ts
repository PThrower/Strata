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
  const serviceClient = createServiceRoleClient()

  await serviceClient.from('submissions').update({
    status: 'rejected',
    claude_reasoning: 'Rejected by admin.',
    reviewed_at: new Date().toISOString(),
  }).eq('id', id)

  return Response.json({ success: true })
}
