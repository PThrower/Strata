import { type NextRequest } from 'next/server'
import { authenticateRequest, logApiRequest } from '@/lib/api-auth'
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
  const auth = await authenticateRequest(request)
  if (!auth.ok) return auth.response

  const { profile, supabase } = auth
  const params = request.nextUrl.searchParams
  const q = params.get('q')
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

  const results = ((data ?? []) as McpServerRow[]).map((row) => ({
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

  return Response.json({ query: q, results })
}
