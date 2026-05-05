import { type NextRequest } from 'next/server'
import {
  authenticateRequest,
  checkEcosystemAccess,
  logApiRequest,
  logQueryAudit,
  rateLimitHeaders,
} from '@/lib/api-auth'
import { serverTiming } from '@/lib/server-timing'

const TOOL = 'integrations'

type SearchRow = {
  id: string
  title: string
  body: string
  category: string
  ecosystem_slug: string
  source_url: string | null
  rank: number
}

type ContentRow = {
  id: string
  title: string
  body: string
  source_url: string | null
}

export async function GET(request: NextRequest) {
  const t0 = Date.now()
  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null

  const auth = await authenticateRequest(request)
  if (!auth.ok) return auth.response

  const { profile, supabase } = auth
  const params = request.nextUrl.searchParams
  const ecosystem = params.get('ecosystem')
  const useCase = params.get('use_case')?.slice(0, 2000) ?? null

  if (!ecosystem) {
    return Response.json({ error: 'ecosystem query param is required' }, { status: 400 })
  }

  const access = await checkEcosystemAccess(supabase, ecosystem, profile.tier)
  if (!access.ok) {
    await logApiRequest(supabase, { apiKey: profile.api_key, tool: TOOL, ecosystem, statusCode: access.response.status })
    return access.response
  }

  let resultIds: string[]
  let items: Array<{ id: string; title: string; body: string; source_urls: string[]; rank?: number }>

  if (useCase) {
    const { data, error } = await supabase.rpc('search_content_items', {
      search_query: useCase,
      filter_ecosystem: access.slug,
      filter_category: 'integrations',
      user_tier: profile.tier,
    })
    if (error) {
      await logApiRequest(supabase, { apiKey: profile.api_key, tool: TOOL, ecosystem, statusCode: 500 })
      return Response.json({ error: 'Search error' }, { status: 500 })
    }
    const rows = ((data ?? []) as SearchRow[])
    resultIds = rows.map(r => r.id)
    items = rows.map((row) => ({
      id: row.id, title: row.title, body: row.body,
      source_urls: row.source_url ? [row.source_url] : [],
      rank: row.rank,
    }))
  } else {
    let query = supabase
      .from('content_items')
      .select('id, title, body, source_url')
      .eq('ecosystem_slug', access.slug)
      .eq('category', 'integrations')
      .eq('is_quarantined', false)
      .order('published_at', { ascending: false })
      .limit(20)

    if (profile.tier === 'free') query = query.eq('is_pro_only', false)

    const { data, error } = await query
    if (error) {
      await logApiRequest(supabase, { apiKey: profile.api_key, tool: TOOL, ecosystem, statusCode: 500 })
      return Response.json({ error: 'Database error' }, { status: 500 })
    }
    const rows = ((data ?? []) as ContentRow[])
    resultIds = rows.map(r => r.id)
    items = rows.map((row) => ({
      id: row.id, title: row.title, body: row.body,
      source_urls: row.source_url ? [row.source_url] : [],
    }))
  }

  await logApiRequest(supabase, { apiKey: profile.api_key, tool: TOOL, ecosystem, statusCode: 200 })
  void logQueryAudit(supabase, {
    apiKey: profile.api_key, tool: TOOL,
    queryParams: { ecosystem, use_case: useCase },
    resultIds, resultCount: resultIds.length,
    statusCode: 200, clientIp, latencyMs: Date.now() - t0,
  })

  return Response.json(
    { ecosystem, items },
    {
      headers: {
        ...rateLimitHeaders({ ok: true, mode: 'auth', profile, supabase }),
        'Server-Timing': serverTiming(t0),
      },
    },
  )
}
