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
import { serverTiming } from '@/lib/server-timing'
import { writeLedgerEntry } from '@/lib/ledger'
import type { RiskLevel } from '@/lib/risk'
import { evaluatePolicy } from '@/lib/policy-engine'

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

  // Advisory policy verdict — authenticated callers only.
  // Does NOT block the response; agents decide what to do with policy_verdict.
  let policyVerdict: { allowed: boolean; rule_name: string | null; reason: string | null } | undefined
  if (auth.mode === 'auth' && row) {
    const decision = await evaluatePolicy(auth.supabase, {
      profileId:              auth.profile.id,
      agentId:                request.headers.get('x-agent-id'),
      toolName:               'mcp-verify',
      serverCapabilityFlags:  row.capability_flags ?? [],
      serverRiskLevel:        body.risk_level as string,
      serverUrl:              row.url ?? null,
    })
    policyVerdict = decision.allowed
      ? { allowed: true,  rule_name: null, reason: null }
      : { allowed: false, rule_name: decision.rule_name, reason: decision.reason }
  }

  const responseBody = policyVerdict !== undefined ? { ...body, policy_verdict: policyVerdict } : body

  // Log every call, including anon, so /verify usage shows up in dashboards.
  // Anon traffic is bucketed under a sentinel "anon" key so per-user
  // analytics still work for authenticated callers.
  const auditKey = auth.mode === 'auth' ? auth.profile.api_key : 'anon'
  await logApiRequest(supabase, {
    apiKey: auditKey, tool: TOOL, ecosystem: 'mcp', statusCode: 200,
  })
  void logQueryAudit(supabase, {
    apiKey: auditKey,
    tool: TOOL,
    queryParams: id as unknown as Record<string, unknown>,
    resultIds: row ? [row.id] : [],
    resultCount: row ? 1 : 0,
    statusCode: 200,
    clientIp,
    latencyMs: Date.now() - t0,
  })

  void writeLedgerEntry({
    profileId: auth.mode === 'auth' ? auth.profile.id : null,
    agentId: request.headers.get('x-agent-id'),
    toolCalled: TOOL,
    serverUrl: row?.url ?? null,
    parameters: id as unknown as Record<string, unknown>,
    responseSummary: {
      risk_level: body.risk_level,
      trusted: body.trusted,
      flags: body.capability_flags ?? [],
    },
    riskLevel: body.risk_level as RiskLevel,
    capabilityFlags: row?.capability_flags ?? null,
    durationMs: Date.now() - t0,
  })

  return Response.json(responseBody, {
    headers: { ...rateLimitHeaders(auth), 'Server-Timing': serverTiming(t0) },
  })
}
