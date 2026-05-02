import { type NextRequest } from 'next/server'
import { createUserClient, createServiceRoleClient } from '@/lib/supabase-server'
import { validateSubmission } from '@/lib/submission-validator'
import { scanForInjection } from '@/lib/injection-scanner'

function isValidUrl(s: string) {
  try { new URL(s); return true } catch { return false }
}

const VALID_CATEGORIES = ['best_practices', 'news', 'integrations'] as const

const TITLE_MAX = 200
const BODY_MIN = 50
const BODY_MAX = 5000
const URL_MAX = 2048
const HOURLY_LIMIT = 10

export async function POST(req: NextRequest) {
  const userClient = await createUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })

  let parsed: unknown
  try {
    parsed = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  if (!parsed || typeof parsed !== 'object') {
    return Response.json({ error: 'Invalid body' }, { status: 400 })
  }

  const { ecosystem, category, title, body: content, sourceUrl } =
    parsed as Record<string, unknown>

  if (typeof ecosystem !== 'string' || typeof category !== 'string'
      || typeof title !== 'string' || typeof content !== 'string') {
    return Response.json({ error: 'Invalid field types' }, { status: 400 })
  }
  if (sourceUrl !== undefined && sourceUrl !== null && typeof sourceUrl !== 'string') {
    return Response.json({ error: 'Invalid sourceUrl' }, { status: 400 })
  }

  if (!(VALID_CATEGORIES as readonly string[]).includes(category)) {
    return Response.json({ error: 'Invalid category' }, { status: 400 })
  }
  if (title.length < 10 || title.length > TITLE_MAX) {
    return Response.json(
      { error: `Title must be 10–${TITLE_MAX} characters` },
      { status: 400 },
    )
  }
  if (content.length < BODY_MIN || content.length > BODY_MAX) {
    return Response.json(
      { error: `Body must be ${BODY_MIN}–${BODY_MAX} characters` },
      { status: 400 },
    )
  }
  if (sourceUrl) {
    if (sourceUrl.length > URL_MAX || !isValidUrl(sourceUrl)) {
      return Response.json({ error: 'Source URL must be a valid URL' }, { status: 400 })
    }
  }

  const serviceClient = createServiceRoleClient()

  const { data: ecoRow, error: ecoErr } = await serviceClient
    .from('ecosystems')
    .select('slug')
    .eq('slug', ecosystem)
    .maybeSingle<{ slug: string }>()
  if (ecoErr) {
    return Response.json({ error: 'Service error' }, { status: 503 })
  }
  if (!ecoRow) {
    return Response.json({ error: 'Unknown ecosystem' }, { status: 400 })
  }

  // Per-user rate limit: cap the number of submissions per rolling hour to
  // bound our Anthropic spend. The submission validator runs an Anthropic
  // call per submission — without this cap a logged-in user can drive
  // unlimited cost.
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { count: recentCount, error: countErr } = await serviceClient
    .from('submissions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('submitted_at', oneHourAgo)
  if (countErr) {
    return Response.json({ error: 'Service error' }, { status: 503 })
  }
  if ((recentCount ?? 0) >= HOURLY_LIMIT) {
    return Response.json(
      { error: `Rate limit: max ${HOURLY_LIMIT} submissions per hour` },
      { status: 429 },
    )
  }

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

  const result = await validateSubmission({
    title,
    body: content,
    sourceUrl: typeof sourceUrl === 'string' ? sourceUrl : undefined,
    ecosystem,
    category,
  })

  // If injection was detected, quarantine the submission regardless of confidence
  if (result.injection_detected) {
    // Write to content_items quarantined so admins can audit, but don't serve it
    await serviceClient.from('content_items').insert({
      ecosystem_slug: ecosystem,
      category,
      title,
      body: content,
      source_url: sourceUrl || null,
      is_pro_only: false,
      is_quarantined: true,
      injection_risk_score: result.injection_risk_score,
      last_verified_at: new Date().toISOString(),
      confidence: 'low',
    })
    await serviceClient.from('submissions').update({
      status: 'rejected',
      claude_confidence: 'low',
      claude_reasoning: 'Prompt injection detected — quarantined.',
      reviewed_at: new Date().toISOString(),
    }).eq('id', submission.id)
    return Response.json({
      submissionId: submission.id,
      status: 'rejected',
      reasoning: 'Submission did not meet quality standards.',
      message: 'Submission did not meet quality standards.',
    })
  }

  if (result.confidence === 'high') {
    const finalTitle = result.improvedTitle || title
    const finalBody =
      result.improvedBody && result.improvedBody.length >= content.length * 0.5
        ? result.improvedBody
        : content

    // H-7: re-scan the final (possibly Claude-rewritten) content before
    // publishing. Catches injection introduced by hallucination or prompt-bleed.
    const postScan = scanForInjection(`${finalTitle} ${finalBody}`)
    if (postScan.score >= 6) {
      await serviceClient.from('content_items').insert({
        ecosystem_slug: ecosystem,
        category,
        title: finalTitle,
        body: finalBody,
        source_url: sourceUrl || null,
        is_pro_only: false,
        is_quarantined: true,
        injection_risk_score: postScan.score,
        last_verified_at: new Date().toISOString(),
        confidence: 'low',
      })
      await serviceClient.from('submissions').update({
        status: 'rejected',
        claude_confidence: 'low',
        claude_reasoning: 'Post-rewrite injection scan quarantined the content.',
        reviewed_at: new Date().toISOString(),
      }).eq('id', submission.id)
      return Response.json({
        submissionId: submission.id,
        status: 'rejected',
        message: 'Submission did not meet quality standards.',
      })
    }

    const { data: contentItem, error: contentErr } = await serviceClient
      .from('content_items')
      .insert({
        ecosystem_slug: ecosystem,
        category,
        title: finalTitle,
        body: finalBody,
        source_url: sourceUrl || null,
        is_pro_only: false,
        is_quarantined: false,
        injection_risk_score: result.injection_risk_score,
        last_verified_at: new Date().toISOString(),
        confidence: result.confidence,
      })
      .select('id')
      .single()

    if (contentErr || !contentItem) {
      // Content insert failed — leave the submission flagged for human review
      // rather than silently marking it approved with no content row.
      await serviceClient.from('submissions').update({
        status: 'flagged',
        claude_confidence: result.confidence,
        claude_reasoning: result.reasoning,
      }).eq('id', submission.id)
      return Response.json({
        submissionId: submission.id,
        status: 'flagged',
        reasoning: 'Approved by validator but publish failed — flagged for review.',
        message: 'Your submission is under review.',
      })
    }

    await serviceClient.from('submissions').update({
      status: 'approved',
      claude_confidence: result.confidence,
      claude_reasoning: result.reasoning,
      content_item_id: contentItem.id,
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
