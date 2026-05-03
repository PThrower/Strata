import { type NextRequest } from 'next/server'
import {
  authenticateRequest,
  checkEcosystemAccess,
  logApiRequest,
  logQueryAudit,
} from '@/lib/api-auth'
import { serverTiming } from '@/lib/server-timing'

const TOOL = 'search'

type SearchRow = {
  id: string
  title: string
  body: string
  category: string
  ecosystem_slug: string
  source_url: string | null
  rank: number
}

export async function GET(request: NextRequest) {
  const t0 = Date.now()
  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null

  const auth = await authenticateRequest(request)
  if (!auth.ok) return auth.response

  const { profile, supabase } = auth
  const params = request.nextUrl.searchParams
  const query = params.get('query')?.slice(0, 2000) ?? null
  const ecosystem = params.get('ecosystem')

  if (!query) {
    return Response.json({ error: 'query param is required' }, { status: 400 })
  }

  const logEcosystem = ecosystem ?? 'all'

  let resolvedEcosystem: string | null = null
  if (ecosystem) {
    const access = await checkEcosystemAccess(supabase, ecosystem, profile.tier)
    if (!access.ok) {
      await logApiRequest(supabase, { apiKey: profile.api_key, tool: TOOL, ecosystem: logEcosystem, statusCode: access.response.status })
      return access.response
    }
    resolvedEcosystem = access.slug
  }

  const { data, error } = await supabase.rpc('search_content_items', {
    search_query: query,
    filter_ecosystem: resolvedEcosystem,
    filter_category: null,
    user_tier: profile.tier,
  })

  if (error) {
    await logApiRequest(supabase, { apiKey: profile.api_key, tool: TOOL, ecosystem: logEcosystem, statusCode: 500 })
    return Response.json({ error: 'Search error' }, { status: 500 })
  }

  const rows = ((data ?? []) as SearchRow[])
  const results = rows.map((row) => ({
    id: row.id,
    title: row.title,
    body: row.body,
    category: row.category,
    ecosystem_slug: row.ecosystem_slug,
    source_urls: row.source_url ? [row.source_url] : [],
  }))

  await logApiRequest(supabase, { apiKey: profile.api_key, tool: TOOL, ecosystem: logEcosystem, statusCode: 200 })
  void logQueryAudit(supabase, {
    apiKey: profile.api_key, tool: TOOL,
    queryParams: { query, ecosystem: logEcosystem },
    resultIds: rows.map(r => r.id), resultCount: rows.length,
    statusCode: 200, clientIp, latencyMs: Date.now() - t0,
  })

  return Response.json(
    { query, results },
    { headers: { 'Server-Timing': serverTiming(t0) } },
  )
}
