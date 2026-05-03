import { type NextRequest } from 'next/server'
import {
  authenticateOrAnon,
  rateLimitHeaders,
  logApiRequest,
  logQueryAudit,
} from '@/lib/api-auth'
import { createServiceRoleClient } from '@/lib/supabase-server'
import {
  type McpRow,
  VERIFY_SELECT_COLUMNS,
  normalizeGitHubUrl,
  buildVerifyResult,
} from '@/lib/mcp-verify-shared'

const TOOL = 'mcp-verify'

type Identifier = { url: string } | { npm: string } | { endpoint: string }

function parseIdentifier(params: URLSearchParams): Identifier | { error: string } {
  const url = params.get('url')
  const npm = params.get('npm')
  const endpoint = params.get('endpoint')
  const provided = [url, npm, endpoint].filter((v) => v !== null && v !== '')

  if (provided.length === 0) {
    return { error: 'one of url, npm, or endpoint query param is required' }
  }
  if (provided.length > 1) {
    return { error: 'pass exactly one of url, npm, or endpoint' }
  }
  if (url) return { url: url.slice(0, 2000) }
  if (npm) return { npm: npm.slice(0, 200) }
  if (endpoint) return { endpoint: endpoint.slice(0, 2000) }
  return { error: 'unreachable' }
}

export async function GET(request: NextRequest) {
  const t0 = Date.now()
  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null

  const auth = await authenticateOrAnon(request)
  if (!auth.ok) return auth.response

  const id = parseIdentifier(request.nextUrl.searchParams)
  if ('error' in id) {
    return Response.json(
      { error: id.error },
      { status: 400, headers: rateLimitHeaders(auth) },
    )
  }

  const supabase = auth.mode === 'auth' ? auth.supabase : createServiceRoleClient()

  let row: McpRow | null = null
  try {
    if ('url' in id) {
      const candidates = normalizeGitHubUrl(id.url)
      const { data } = await supabase
        .from('mcp_servers')
        .select(VERIFY_SELECT_COLUMNS)
        .in('url', candidates)
        .limit(1)
        .maybeSingle<McpRow>()
      row = data
    } else if ('npm' in id) {
      const { data } = await supabase
        .from('mcp_servers')
        .select(VERIFY_SELECT_COLUMNS)
        .eq('npm_package', id.npm)
        .limit(1)
        .maybeSingle<McpRow>()
      row = data
    } else {
      const { data } = await supabase
        .from('mcp_servers')
        .select(VERIFY_SELECT_COLUMNS)
        .eq('hosted_endpoint', id.endpoint)
        .limit(1)
        .maybeSingle<McpRow>()
      row = data
    }
  } catch {
    return Response.json(
      { error: 'Lookup error' },
      { status: 500, headers: rateLimitHeaders(auth) },
    )
  }

  const body = buildVerifyResult(row)

  if (auth.mode === 'auth') {
    await logApiRequest(supabase, {
      apiKey: auth.profile.api_key, tool: TOOL, ecosystem: 'mcp', statusCode: 200,
    })
    void logQueryAudit(supabase, {
      apiKey: auth.profile.api_key,
      tool: TOOL,
      queryParams: id as unknown as Record<string, unknown>,
      resultIds: row ? [row.id] : [],
      resultCount: row ? 1 : 0,
      statusCode: 200,
      clientIp,
      latencyMs: Date.now() - t0,
    })
  }

  return Response.json(body, { headers: rateLimitHeaders(auth) })
}
