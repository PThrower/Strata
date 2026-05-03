import { type NextRequest } from 'next/server'
import {
  authenticateOrAnon,
  rateLimitHeaders,
  logApiRequest,
  logQueryAudit,
} from '@/lib/api-auth'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { embed } from '@/lib/embeddings'
import { freshnessBucket } from '@/lib/mcp-verify-shared'
import { serverTiming } from '@/lib/server-timing'

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
  runtime_score: number | null
  capability_flags: string[] | null
  hosted_endpoint: string | null
  tool_count: number | null
  stars: number | null
  archived: boolean | null
  runtime_updated_at: string | null
}

const KNOWN_FLAGS = new Set([
  'shell_exec', 'fs_write', 'net_egress', 'secret_read',
  'dynamic_eval', 'arbitrary_sql', 'process_spawn',
])

function parseExcludeFlags(raw: string | null): string[] {
  if (!raw) return []
  return raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((s) => KNOWN_FLAGS.has(s))
    .slice(0, 20)
}

export async function GET(request: NextRequest) {
  const t0 = Date.now()
  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null

  const auth = await authenticateOrAnon(request)
  if (!auth.ok) return auth.response

  const params = request.nextUrl.searchParams
  const q = params.get('q')?.slice(0, 2000) ?? null
  const category = params.get('category')
  const rawLimit = parseInt(params.get('limit') ?? '5', 10)
  const limit = Math.min(Math.max(1, isNaN(rawLimit) ? 5 : rawLimit), 20)
  const rawMinSec = parseInt(params.get('min_security_score') ?? '30', 10)
  const minSecurityScore = Math.min(100, Math.max(0, isNaN(rawMinSec) ? 30 : rawMinSec))
  const rawMinRun = parseInt(params.get('min_runtime_score') ?? '0', 10)
  const minRuntimeScore = Math.min(100, Math.max(0, isNaN(rawMinRun) ? 0 : rawMinRun))
  const excludeFlags = parseExcludeFlags(params.get('exclude_capability_flags'))
  const requireHosted = params.get('require_hosted') === 'true'

  if (!q) {
    return Response.json(
      { error: 'q param is required' },
      { status: 400, headers: rateLimitHeaders(auth) },
    )
  }

  const supabase = auth.mode === 'auth' ? auth.supabase : createServiceRoleClient()
  const apiKey = auth.mode === 'auth' ? auth.profile.api_key : null

  let embedding: number[]
  try {
    embedding = await embed(q)
  } catch {
    if (apiKey) {
      await logApiRequest(supabase, { apiKey, tool: TOOL, ecosystem: 'mcp', statusCode: 500 })
    }
    return Response.json(
      { error: 'Embedding error' },
      { status: 500, headers: rateLimitHeaders(auth) },
    )
  }

  const { data, error } = await supabase.rpc('search_mcp_servers', {
    query_embedding: embedding,
    filter_category: category ?? null,
    match_count: limit,
    min_security_score: minSecurityScore,
    min_runtime_score: minRuntimeScore,
    exclude_capability_flags: excludeFlags,
    require_hosted: requireHosted,
  })

  if (error) {
    if (apiKey) {
      await logApiRequest(supabase, { apiKey, tool: TOOL, ecosystem: 'mcp', statusCode: 500 })
    }
    return Response.json(
      { error: 'Search error' },
      { status: 500, headers: rateLimitHeaders(auth) },
    )
  }

  const rows = (data ?? []) as McpServerRow[]
  const results = rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    url: row.url,
    category: row.category,
    tags: row.tags,
    similarity: Math.round(row.similarity * 1000) / 1000,
    security_score: row.security_score,
    runtime_score: row.runtime_score,
    capability_flags: row.capability_flags ?? [],
    hosted_endpoint: row.hosted_endpoint,
    tool_count: row.tool_count,
    stars: row.stars,
    runtime_freshness: freshnessBucket(row.runtime_updated_at),
  }))

  if (apiKey) {
    await logApiRequest(supabase, { apiKey, tool: TOOL, ecosystem: 'mcp', statusCode: 200 })
    void logQueryAudit(supabase, {
      apiKey, tool: TOOL,
      queryParams: {
        q, category, limit,
        min_security_score: minSecurityScore,
        min_runtime_score: minRuntimeScore,
        exclude_capability_flags: excludeFlags,
        require_hosted: requireHosted,
      },
      resultIds: rows.map((r) => r.id),
      resultCount: rows.length,
      statusCode: 200, clientIp, latencyMs: Date.now() - t0,
    })
  }

  return Response.json(
    { query: q, results },
    { headers: { ...rateLimitHeaders(auth), 'Server-Timing': serverTiming(t0) } },
  )
}
