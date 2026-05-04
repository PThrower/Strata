import { type NextRequest } from 'next/server'
import {
  authenticateRequest,
  checkEcosystemAccess,
  logApiRequest,
  logQueryAudit,
  rateLimitHeaders,
} from '@/lib/api-auth'
import { freshnessEnvelope } from '@/lib/freshness'
import { serverTiming } from '@/lib/server-timing'

const TOOL = 'news'
const DEFAULT_LIMIT = 5
const MAX_LIMIT = 20
const FREE_TIER_DELAY_MS = 24 * 60 * 60 * 1000

type Row = {
  id: string
  title: string
  body: string
  source_url: string | null
  published_at: string
  last_verified_at: string | null
  confidence: string | null
  source_count: number | null
}

export async function GET(request: NextRequest) {
  const t0 = Date.now()
  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null

  const auth = await authenticateRequest(request)
  if (!auth.ok) return auth.response

  const { profile, supabase } = auth
  const params = request.nextUrl.searchParams
  const ecosystem = params.get('ecosystem')
  const limit = parseLimit(params.get('limit'))

  if (!ecosystem) {
    return Response.json({ error: 'ecosystem query param is required' }, { status: 400 })
  }

  const access = await checkEcosystemAccess(supabase, ecosystem, profile.tier)
  if (!access.ok) {
    await logApiRequest(supabase, { apiKey: profile.api_key, tool: TOOL, ecosystem, statusCode: access.response.status })
    return access.response
  }

  let query = supabase
    .from('content_items')
    .select('id, title, body, source_url, published_at, last_verified_at, confidence, source_count')
    .eq('ecosystem_slug', access.slug)
    .eq('category', 'news')
    .eq('is_quarantined', false)
    .order('published_at', { ascending: false })
    .limit(limit)

  if (profile.tier === 'free') {
    const cutoff = new Date(Date.now() - FREE_TIER_DELAY_MS).toISOString()
    query = query.lt('published_at', cutoff).eq('is_pro_only', false)
  }

  const { data, error } = await query
  if (error) {
    await logApiRequest(supabase, { apiKey: profile.api_key, tool: TOOL, ecosystem, statusCode: 500 })
    return Response.json({ error: 'Database error' }, { status: 500 })
  }

  const rows = (data ?? []) as Row[]
  const items = rows.map((row) => ({
    id: row.id,
    title: row.title,
    body: row.body,
    source_urls: row.source_url ? [row.source_url] : [],
    confidence: row.confidence ?? 'medium',
    source_count: row.source_count ?? 1,
    published_at: row.published_at,
    ...freshnessEnvelope(row.published_at, row.last_verified_at),
  }))

  await logApiRequest(supabase, { apiKey: profile.api_key, tool: TOOL, ecosystem, statusCode: 200 })
  void logQueryAudit(supabase, {
    apiKey: profile.api_key, tool: TOOL,
    queryParams: { ecosystem, limit },
    resultIds: rows.map(r => r.id), resultCount: rows.length,
    statusCode: 200, clientIp, latencyMs: Date.now() - t0,
  })

  return Response.json(
    { ecosystem, tier: profile.tier, items },
    {
      headers: {
        ...rateLimitHeaders({ ok: true, mode: 'auth', profile, supabase }),
        'Server-Timing': serverTiming(t0),
      },
    },
  )
}

function parseLimit(raw: string | null): number {
  if (!raw) return DEFAULT_LIMIT
  const n = Number.parseInt(raw, 10)
  if (Number.isNaN(n) || n < 1) return DEFAULT_LIMIT
  return Math.min(n, MAX_LIMIT)
}
