import { type NextRequest } from 'next/server'
import { authenticateRequest, logApiRequest, logQueryAudit } from '@/lib/api-auth'
import { embed } from '@/lib/embeddings'

const TOOL = 'mcp-servers'

type McpServerRow = {
  id: string
  name: string
  description: string | null
  url: string | null
  category: string | null
  tags: string[]
  similarity: number
  security_score: number | null
  stars: number | null
  archived: boolean | null
}

export async function GET(request: NextRequest) {
  const t0 = Date.now()
  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null

  const auth = await authenticateRequest(request)
  if (!auth.ok) return auth.response

  const { profile, supabase } = auth
  const params = request.nextUrl.searchParams
  const q = params.get('q')?.slice(0, 2000) ?? null
  const category = params.get('category')
  const rawLimit = parseInt(params.get('limit') ?? '5', 10)
  const limit = Math.min(Math.max(1, isNaN(rawLimit) ? 5 : rawLimit), 20)
  const rawMinScore = parseInt(params.get('min_security_score') ?? '30', 10)
  const minSecurityScore = Math.min(100, Math.max(0, isNaN(rawMinScore) ? 30 : rawMinScore))

  if (!q) {
    return Response.json({ error: 'q param is required' }, { status: 400 })
  }

  let embedding: number[]
  try {
    embedding = await embed(q)
  } catch {
    await logApiRequest(supabase, { apiKey: profile.api_key, tool: TOOL, ecosystem: 'mcp', statusCode: 500 })
    return Response.json({ error: 'Embedding error' }, { status: 500 })
  }

  const { data, error } = await supabase.rpc('search_mcp_servers', {
    query_embedding: embedding,
    filter_category: category ?? null,
    match_count: limit,
    min_security_score: minSecurityScore,
  })

  if (error) {
    await logApiRequest(supabase, { apiKey: profile.api_key, tool: TOOL, ecosystem: 'mcp', statusCode: 500 })
    return Response.json({ error: 'Search error' }, { status: 500 })
  }

  const rows = ((data ?? []) as McpServerRow[])
  const results = rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    url: row.url,
    category: row.category,
    tags: row.tags,
    similarity: Math.round(row.similarity * 1000) / 1000,
    security_score: row.security_score,
    stars: row.stars,
  }))

  await logApiRequest(supabase, { apiKey: profile.api_key, tool: TOOL, ecosystem: 'mcp', statusCode: 200 })
  void logQueryAudit(supabase, {
    apiKey: profile.api_key, tool: TOOL,
    queryParams: { q, category, limit, min_security_score: minSecurityScore },
    resultIds: rows.map(r => r.id), resultCount: rows.length,
    statusCode: 200, clientIp, latencyMs: Date.now() - t0,
  })

  return Response.json({ query: q, results })
}
