// GET /api/v1/dependency-graph?period=7d|30d|90d|all
// Returns the authenticated caller's MCP server dependency graph:
// nodes (servers they depend on) and edges (data flows between them).

import { type NextRequest } from 'next/server'
import { authenticateRequest, logApiRequest } from '@/lib/api-auth'
import { assembleDepGraph } from '@/lib/dependency-graph'
import { serverTiming } from '@/lib/server-timing'

const VALID_PERIODS: Record<string, number | null> = {
  '7d':  7,
  '30d': 30,
  '90d': 90,
  'all': null,
}

export async function GET(request: NextRequest) {
  const t0 = Date.now()

  const auth = await authenticateRequest(request)
  if (!auth.ok) return auth.response

  const periodParam = request.nextUrl.searchParams.get('period') ?? '30d'
  if (!(periodParam in VALID_PERIODS)) {
    return Response.json({ error: 'period must be one of: 7d, 30d, 90d, all' }, { status: 400 })
  }
  const periodDays = VALID_PERIODS[periodParam]

  const graph = await assembleDepGraph(auth.supabase, auth.profile.id, periodDays)

  await logApiRequest(auth.supabase, {
    apiKey: auth.profile.api_key, tool: 'dependency-graph', ecosystem: 'mcp', statusCode: 200,
  })

  return Response.json(graph, { headers: { 'Server-Timing': serverTiming(t0) } })
}
