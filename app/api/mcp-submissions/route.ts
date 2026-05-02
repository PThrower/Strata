import { type NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { scanForInjection } from '@/lib/injection-scanner'
import { embedBatch } from '@/lib/embeddings'
import { parseGitHubUrl, fetchGitHubSignals, RateLimiter } from '@/scripts/refresh/github-security'
import { computeSecurityScore } from '@/scripts/refresh/security-score'

// Per-IP rate limit: max 3 submissions per IP per hour (in-process, per instance)
const SUBMIT_IP_WINDOW_MS = 60 * 60 * 1000
const SUBMIT_IP_MAX = 3
const submitIpWindows = new Map<string, { n: number; reset: number }>()

function allowSubmitIp(ip: string): boolean {
  const now = Date.now()
  if (submitIpWindows.size > 5_000) {
    for (const [k, v] of submitIpWindows) if (v.reset <= now) submitIpWindows.delete(k)
  }
  const w = submitIpWindows.get(ip)
  if (!w || w.reset <= now) {
    submitIpWindows.set(ip, { n: 1, reset: now + SUBMIT_IP_WINDOW_MS })
    return true
  }
  if (w.n >= SUBMIT_IP_MAX) return false
  w.n++
  return true
}

export const MCP_CATEGORIES = [
  'Browser Automation',
  'Cloud Platforms',
  'Code Execution',
  'Communication',
  'Databases',
  'Data Processing',
  'Developer Tools',
  'File System',
  'Finance',
  'Gaming',
  'Knowledge & Memory',
  'Language & Translation',
  'Media Production',
  'Monitoring',
  'Other Tools and Integrations',
  'Research & Data',
  'Security',
  'Search',
  'Testing',
] as const

const NAME_MAX = 100
const DESC_MAX = 500
const EMAIL_MAX = 254

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? ''
  if (ip && !allowSubmitIp(ip)) {
    return Response.json({ error: 'Too many submissions — max 3 per hour' }, { status: 429 })
  }

  let body: unknown
  try { body = await req.json() } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  if (!body || typeof body !== 'object') {
    return Response.json({ error: 'Invalid body' }, { status: 400 })
  }

  const { githubUrl, name, description, category, submitterEmail } = body as Record<string, unknown>

  if (typeof githubUrl !== 'string' || typeof name !== 'string' ||
      typeof description !== 'string' || typeof category !== 'string') {
    return Response.json({ error: 'githubUrl, name, description, and category are required' }, { status: 400 })
  }

  const parsed = parseGitHubUrl(githubUrl)
  if (!parsed) {
    return Response.json({ error: 'GitHub URL must be a valid github.com/owner/repo URL' }, { status: 400 })
  }

  if (name.trim().length < 2 || name.length > NAME_MAX) {
    return Response.json({ error: `Name must be 2–${NAME_MAX} characters` }, { status: 400 })
  }
  if (description.trim().length < 10 || description.length > DESC_MAX) {
    return Response.json({ error: `Description must be 10–${DESC_MAX} characters` }, { status: 400 })
  }
  if (!(MCP_CATEGORIES as readonly string[]).includes(category)) {
    return Response.json({ error: 'Invalid category' }, { status: 400 })
  }

  let email: string | null = null
  if (submitterEmail !== undefined && submitterEmail !== '' && submitterEmail !== null) {
    if (typeof submitterEmail !== 'string' || !submitterEmail.includes('@')) {
      return Response.json({ error: 'Invalid submitter email' }, { status: 400 })
    }
    email = submitterEmail.slice(0, EMAIL_MAX)
  }

  const supabase = createServiceRoleClient()

  // Dedup: URL already in directory (pending or live)
  const { data: existing } = await supabase
    .from('mcp_servers')
    .select('id, score_status')
    .eq('url', githubUrl)
    .maybeSingle<{ id: string; score_status: string | null }>()

  if (existing) {
    const msg = existing.score_status === 'pending_review'
      ? 'This server has already been submitted and is pending review'
      : 'This MCP server is already in the directory'
    return Response.json({ error: msg }, { status: 409 })
  }

  // Layer 1 injection scan
  const l1 = scanForInjection(`${name} ${description}`)
  if (l1.score >= 6) {
    return Response.json({ error: 'Submission rejected: content flagged by security scan' }, { status: 400 })
  }
  const flaggedByInjection = l1.score >= 3

  // Fetch GitHub metadata
  const limiter = new RateLimiter()
  const ghResult = await fetchGitHubSignals(parsed.owner, parsed.repo, limiter)

  if (ghResult.status === 'not_found') {
    return Response.json({ error: 'GitHub repository not found — check the URL' }, { status: 400 })
  }

  const now = new Date().toISOString()
  let scoreStatus: string
  let securityScore: number | null = null
  let scoreComponents: Record<string, number> | null = null
  let stars: number | null = null
  let forks: number | null = null
  let openIssues: number | null = null
  let archived: boolean | null = null
  let isFork: boolean | null = null
  let licenseSpdx: string | null = null
  let pushedAt: string | null = null
  let lastCommitAt: string | null = null
  let lastReleaseAt: string | null = null
  let hasReleases: boolean | null = null
  let scoreUpdatedAt: string | null = null

  if (ghResult.status === 'scored' && ghResult.signals) {
    const { score, components } = computeSecurityScore(ghResult.signals)
    securityScore = score
    scoreComponents = components
    stars = ghResult.signals.stars
    forks = ghResult.signals.forks
    openIssues = ghResult.signals.openIssues
    archived = ghResult.signals.archived
    isFork = ghResult.signals.isFork
    licenseSpdx = ghResult.signals.licenseSpdx
    pushedAt = ghResult.signals.pushedAt
    lastCommitAt = ghResult.signals.lastCommitAt
    lastReleaseAt = ghResult.signals.lastReleaseAt
    hasReleases = ghResult.signals.hasReleases
    scoreUpdatedAt = now
    scoreStatus = flaggedByInjection ? 'pending_review' : 'scored'
  } else {
    // GitHub fetch error — always queue for review
    scoreStatus = 'pending_review'
  }

  // Generate embedding (required for search_mcp_servers to return this row)
  let embedding: number[]
  try {
    const [emb] = await embedBatch([`${name.trim()}: ${description.trim()}`])
    embedding = emb
  } catch {
    return Response.json({ error: 'Failed to process submission — please try again' }, { status: 503 })
  }

  const { data: inserted, error: insertErr } = await supabase
    .from('mcp_servers')
    .insert({
      name: name.trim(),
      description: description.trim(),
      url: githubUrl,
      category,
      source: 'community_submission',
      tags: [] as string[],
      embedding,
      is_quarantined: false,
      injection_risk_score: l1.score,
      injection_scanned_at: now,
      score_status: scoreStatus,
      score_updated_at: scoreUpdatedAt,
      security_score: securityScore,
      score_components: scoreComponents,
      stars,
      forks,
      open_issues: openIssues,
      archived,
      is_fork: isFork,
      license_spdx: licenseSpdx,
      pushed_at: pushedAt,
      last_commit_at: lastCommitAt,
      last_release_at: lastReleaseAt,
      has_releases: hasReleases,
      gh_owner: parsed.owner,
      gh_repo: parsed.repo,
      submitter_email: email,
      updated_at: now,
    })
    .select('id')
    .single()

  if (insertErr || !inserted) {
    return Response.json({ error: 'Failed to save submission' }, { status: 500 })
  }

  const pending = scoreStatus === 'pending_review'
  return Response.json({
    id: inserted.id,
    status: pending ? 'pending_review' : 'live',
    security_score: securityScore,
    message: pending
      ? 'Your MCP server has been submitted and is pending review by our team.'
      : 'Your MCP server has been added to the Strata directory.',
  })
}
