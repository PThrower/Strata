import { type NextRequest } from 'next/server'
import { createUserClient, createServiceRoleClient } from '@/lib/supabase-server'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userClient = await createUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const serviceClient = createServiceRoleClient()

  const { data: submission } = await serviceClient
    .from('submissions')
    .select('*')
    .eq('id', id)
    .single()

  if (!submission) return Response.json({ error: 'Not found' }, { status: 404 })
  if (submission.status !== 'flagged') {
    return Response.json({ error: 'Submission is not flagged' }, { status: 400 })
  }

  const { data: contentItem } = await serviceClient
    .from('content_items')
    .insert({
      ecosystem_slug: submission.ecosystem_slug,
      category: submission.category,
      title: submission.title,
      body: submission.body,
      source_url: submission.source_url ?? null,
      is_pro_only: false,
    })
    .select('id')
    .single()

  await serviceClient.from('submissions').update({
    status: 'approved',
    content_item_id: contentItem?.id ?? null,
    reviewed_at: new Date().toISOString(),
  }).eq('id', id)

  return Response.json({ success: true })
}
