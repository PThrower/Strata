import { type NextRequest } from 'next/server'
import {
  authenticateRequest,
  checkEcosystemAccess,
  logApiRequest,
  logQueryAudit,
} from '@/lib/api-auth'
import { freshnessEnvelope } from '@/lib/freshness'
import { serverTiming } from '@/lib/server-timing'

const TOOL = 'best-practices'

type Row = {
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

export async function GET(request: NextRequest) {
  const t0 = Date.now()
  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null

  const auth = await authenticateRequest(request)
  if (!auth.ok) return auth.response

  const { profile, supabase } = auth
  const params = request.nextUrl.searchParams
  const ecosystem = params.get('ecosystem')
  const category = params.get('category') ?? 'best_practices'

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
    .select('id, title, body, source_url, published_at, last_verified_at, confidence, source_count, created_at')
    .eq('ecosystem_slug', access.slug)
    .eq('category', category)
    .eq('is_quarantined', false)
    .order('published_at', { ascending: false })

  if (profile.tier === 'free') query = query.eq('is_pro_only', false)

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
    updated_at: row.created_at,
    ...freshnessEnvelope(row.published_at ?? row.created_at, row.last_verified_at),
  }))

  await logApiRequest(supabase, { apiKey: profile.api_key, tool: TOOL, ecosystem, statusCode: 200 })
  void logQueryAudit(supabase, {
    apiKey: profile.api_key, tool: TOOL,
    queryParams: { ecosystem, category },
    resultIds: rows.map(r => r.id), resultCount: rows.length,
    statusCode: 200, clientIp, latencyMs: Date.now() - t0,
  })

  return Response.json(
    { ecosystem, category, items },
    { headers: { 'Server-Timing': serverTiming(t0) } },
  )
}
