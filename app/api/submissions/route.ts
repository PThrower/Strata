import { type NextRequest } from 'next/server'
import { createUserClient, createServiceRoleClient } from '@/lib/supabase-server'
import { validateSubmission } from '@/lib/submission-validator'

function isValidUrl(s: string) {
  try { new URL(s); return true } catch { return false }
}

const VALID_CATEGORIES = ['best_practices', 'news', 'integrations'] as const

export async function POST(req: NextRequest) {
  const userClient = await createUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })

  const body = await req.json() as Record<string, string>
  const { ecosystem, category, title, body: content, sourceUrl } = body

  if (!ecosystem || !category || !(VALID_CATEGORIES as readonly string[]).includes(category)) {
    return Response.json({ error: 'Invalid ecosystem or category' }, { status: 400 })
  }
  if (!title || title.length < 10) {
    return Response.json({ error: 'Title must be at least 10 characters' }, { status: 400 })
  }
  if (!content || content.length < 50) {
    return Response.json({ error: 'Content must be at least 50 characters' }, { status: 400 })
  }
  if (sourceUrl && !isValidUrl(sourceUrl)) {
    return Response.json({ error: 'Source URL must be a valid URL' }, { status: 400 })
  }

  const serviceClient = createServiceRoleClient()

  const { data: submission, error: insertErr } = await serviceClient
    .from('submissions')
    .insert({
      user_id: user.id,
      ecosystem_slug: ecosystem,
      category,
      title,
      body: content,
      source_url: sourceUrl || null,
      status: 'pending',
    })
    .select('id')
    .single()

  if (insertErr || !submission) {
    return Response.json({ error: 'Failed to save submission' }, { status: 500 })
  }

  const result = await validateSubmission({ title, body: content, sourceUrl, ecosystem, category })

  if (result.confidence === 'high') {
    const finalTitle = result.improvedTitle || title
    const finalBody = result.improvedBody || content

    const { data: contentItem } = await serviceClient
      .from('content_items')
      .insert({
        ecosystem_slug: ecosystem,
        category,
        title: finalTitle,
        body: finalBody,
        source_url: sourceUrl || null,
        is_pro_only: false,
      })
      .select('id')
      .single()

    await serviceClient.from('submissions').update({
      status: 'approved',
      claude_confidence: result.confidence,
      claude_reasoning: result.reasoning,
      content_item_id: contentItem?.id ?? null,
      reviewed_at: new Date().toISOString(),
    }).eq('id', submission.id)

    return Response.json({
      submissionId: submission.id,
      status: 'approved',
      reasoning: result.reasoning,
      message: 'Your submission has been published.',
    })
  }

  if (result.confidence === 'medium') {
    await serviceClient.from('submissions').update({
      status: 'flagged',
      claude_confidence: result.confidence,
      claude_reasoning: result.reasoning,
    }).eq('id', submission.id)

    return Response.json({
      submissionId: submission.id,
      status: 'flagged',
      reasoning: result.reasoning,
      message: 'Your submission is under review.',
    })
  }

  await serviceClient.from('submissions').update({
    status: 'rejected',
    claude_confidence: result.confidence,
    claude_reasoning: result.reasoning,
    reviewed_at: new Date().toISOString(),
  }).eq('id', submission.id)

  return Response.json({
    submissionId: submission.id,
    status: 'rejected',
    reasoning: result.reasoning,
    message: 'Submission did not meet quality standards.',
  })
}
