import { type NextRequest } from 'next/server'
import {
  authenticateRequest,
  checkEcosystemAccess,
  logApiRequest,
  logQueryAudit,
} from '@/lib/api-auth'
import { freshnessEnvelope } from '@/lib/freshness'

const TOOL = 'ecosystem-brief'
const NEWS_DEFAULT_LIMIT = 10
const BEST_PRACTICES_DEFAULT_LIMIT = 5
const INTEGRATIONS_DEFAULT_LIMIT = 10
const FREE_TIER_NEWS_DELAY_MS = 24 * 60 * 60 * 1000

interface BestPracticeRow {
  id: string
  title: string
  body: string
  source_url: string | null
  published_at: string
  last_verified_at: string | null
  confidence: string | null
  source_count: number | null
  created_at: string
}

interface NewsRow {
  id: string
  title: string
  body: string
  source_url: string | null
  published_at: string
  last_verified_at: string | null
  confidence: string | null
  source_count: number | null
}

interface IntegrationRow {
  id: string
  title: string
  body: string
  source_url: string | null
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const t0 = Date.now()
  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null

  const auth = await authenticateRequest(request)
  if (!auth.ok) return auth.response
  const { profile, supabase } = auth

  const { slug } = await params
  const access = await checkEcosystemAccess(supabase, slug, profile.tier)
  if (!access.ok) {
    await logApiRequest(supabase, {
      apiKey: profile.api_key, tool: TOOL, ecosystem: slug, statusCode: access.response.status,
    })
    return access.response
  }
  const resolvedSlug = access.slug

  // Run all three queries in parallel.
  const bestPracticesQuery = (() => {
    let q = supabase
      .from('content_items')
      .select(
        'id, title, body, source_url, published_at, last_verified_at, confidence, source_count, created_at',
      )
      .eq('ecosystem_slug', resolvedSlug)
      .eq('category', 'best_practices')
      .eq('is_quarantined', false)
      .order('published_at', { ascending: false })
      .limit(BEST_PRACTICES_DEFAULT_LIMIT)
    if (profile.tier === 'free') q = q.eq('is_pro_only', false)
    return q.returns<BestPracticeRow[]>()
  })()

  const newsQuery = (() => {
    let q = supabase
      .from('content_items')
      .select(
        'id, title, body, source_url, published_at, last_verified_at, confidence, source_count',
      )
      .eq('ecosystem_slug', resolvedSlug)
      .eq('category', 'news')
      .eq('is_quarantined', false)
      .order('published_at', { ascending: false })
      .limit(NEWS_DEFAULT_LIMIT)
    if (profile.tier === 'free') {
      const cutoff = new Date(Date.now() - FREE_TIER_NEWS_DELAY_MS).toISOString()
      q = q.lt('published_at', cutoff).eq('is_pro_only', false)
    }
    return q.returns<NewsRow[]>()
  })()

  const integrationsQuery = (() => {
    let q = supabase
      .from('content_items')
      .select('id, title, body, source_url')
      .eq('ecosystem_slug', resolvedSlug)
      .eq('category', 'integrations')
      .eq('is_quarantined', false)
      .order('published_at', { ascending: false })
      .limit(INTEGRATIONS_DEFAULT_LIMIT)
    if (profile.tier === 'free') q = q.eq('is_pro_only', false)
    return q.returns<IntegrationRow[]>()
  })()

  const [bpResp, newsResp, intResp] = await Promise.all([
    bestPracticesQuery,
    newsQuery,
    integrationsQuery,
  ])

  if (bpResp.error || newsResp.error || intResp.error) {
    await logApiRequest(supabase, {
      apiKey: profile.api_key, tool: TOOL, ecosystem: resolvedSlug, statusCode: 500,
    })
    return Response.json({ error: 'Database error' }, { status: 500 })
  }

  const bestPractices = (bpResp.data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    body: row.body,
    source_urls: row.source_url ? [row.source_url] : [],
    confidence: row.confidence ?? 'medium',
    source_count: row.source_count ?? 1,
    updated_at: row.created_at,
    ...freshnessEnvelope(row.published_at ?? row.created_at, row.last_verified_at),
  }))

  const news = (newsResp.data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    body: row.body,
    source_urls: row.source_url ? [row.source_url] : [],
    confidence: row.confidence ?? 'medium',
    source_count: row.source_count ?? 1,
    published_at: row.published_at,
    ...freshnessEnvelope(row.published_at, row.last_verified_at),
  }))

  const integrations = (intResp.data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    body: row.body,
    source_urls: row.source_url ? [row.source_url] : [],
  }))

  const allIds = [
    ...(bpResp.data ?? []).map((r) => r.id),
    ...(newsResp.data ?? []).map((r) => r.id),
    ...(intResp.data ?? []).map((r) => r.id),
  ]

  await logApiRequest(supabase, {
    apiKey: profile.api_key, tool: TOOL, ecosystem: resolvedSlug, statusCode: 200,
  })
  void logQueryAudit(supabase, {
    apiKey: profile.api_key, tool: TOOL,
    queryParams: { slug: resolvedSlug },
    resultIds: allIds, resultCount: allIds.length,
    statusCode: 200, clientIp, latencyMs: Date.now() - t0,
  })

  return Response.json({
    ecosystem: resolvedSlug,
    tier: profile.tier,
    best_practices: bestPractices,
    news,
    integrations,
  })
}
