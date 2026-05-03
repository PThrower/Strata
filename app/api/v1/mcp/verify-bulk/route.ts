import { type NextRequest } from 'next/server'
import {
  authenticateRequest,
  logApiRequest,
  logQueryAudit,
  FREE_LIMIT,
  PRO_LIMIT,
} from '@/lib/api-auth'
import { unknownRisk } from '@/lib/risk'
import {
  type McpRow,
  VERIFY_SELECT_COLUMNS,
  normalizeGitHubUrl,
  buildVerifyResult,
} from '@/lib/mcp-verify-shared'

const TOOL = 'mcp-verify-bulk'
const MAX_IDENTIFIERS = 50

type Identifier = { url: string } | { npm: string } | { endpoint: string }

function validateIdentifier(raw: unknown): Identifier | null {
  if (!raw || typeof raw !== 'object') return null
  const obj = raw as Record<string, unknown>
  if (typeof obj.url === 'string' && obj.url.length > 0 && obj.url.length <= 2000) {
    return { url: obj.url }
  }
  if (typeof obj.npm === 'string' && obj.npm.length > 0 && obj.npm.length <= 200) {
    return { npm: obj.npm }
  }
  if (typeof obj.endpoint === 'string' && obj.endpoint.length > 0 && obj.endpoint.length <= 2000) {
    return { endpoint: obj.endpoint }
  }
  return null
}

export async function POST(request: NextRequest) {
  const t0 = Date.now()
  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null

  const auth = await authenticateRequest(request)
  if (!auth.ok) return auth.response
  const { profile, supabase } = auth

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'invalid JSON body' }, { status: 400 })
  }

  if (!body || typeof body !== 'object' || !Array.isArray((body as { identifiers?: unknown }).identifiers)) {
    return Response.json(
      { error: 'body must be { "identifiers": [{...}, ...] }' },
      { status: 400 },
    )
  }

  const rawIdentifiers = (body as { identifiers: unknown[] }).identifiers
  if (rawIdentifiers.length === 0) {
    return Response.json({ error: 'identifiers must be non-empty' }, { status: 400 })
  }
  if (rawIdentifiers.length > MAX_IDENTIFIERS) {
    return Response.json(
      { error: `max ${MAX_IDENTIFIERS} identifiers per request, got ${rawIdentifiers.length}` },
      { status: 400 },
    )
  }

  const identifiers: (Identifier | null)[] = rawIdentifiers.map(validateIdentifier)
  if (identifiers.every((i) => i === null)) {
    return Response.json(
      { error: 'no valid identifiers; each must be { url } | { npm } | { endpoint }' },
      { status: 400 },
    )
  }

  // Charge additional calls for batch overhead (auth already charged 1).
  const totalCalls = Math.ceil(identifiers.length / 10)
  const additional = totalCalls - 1
  if (additional > 0) {
    const limit = profile.tier === 'pro' ? PRO_LIMIT : FREE_LIMIT
    const newCount = profile.calls_used + additional
    if (newCount > limit) {
      return Response.json(
        { error: 'Monthly limit reached', tier: profile.tier },
        { status: 429 },
      )
    }
    await supabase.from('profiles').update({ calls_used: newCount }).eq('id', profile.id)
  }

  // Three IN queries (one per identifier type) keep DB round trips at ≤3.
  const urlCandidates = new Set<string>()
  const npmCandidates = new Set<string>()
  const endpointCandidates = new Set<string>()
  for (const id of identifiers) {
    if (!id) continue
    if ('url' in id) for (const v of normalizeGitHubUrl(id.url)) urlCandidates.add(v)
    if ('npm' in id) npmCandidates.add(id.npm)
    if ('endpoint' in id) endpointCandidates.add(id.endpoint)
  }

  const promises: Array<Promise<{ data: McpRow[] | null; error: unknown }>> = []
  if (urlCandidates.size > 0) {
    promises.push(
      Promise.resolve(
        supabase
          .from('mcp_servers')
          .select(VERIFY_SELECT_COLUMNS)
          .in('url', [...urlCandidates])
          .returns<McpRow[]>(),
      ),
    )
  }
  if (npmCandidates.size > 0) {
    promises.push(
      Promise.resolve(
        supabase
          .from('mcp_servers')
          .select(VERIFY_SELECT_COLUMNS)
          .in('npm_package', [...npmCandidates])
          .returns<McpRow[]>(),
      ),
    )
  }
  if (endpointCandidates.size > 0) {
    promises.push(
      Promise.resolve(
        supabase
          .from('mcp_servers')
          .select(VERIFY_SELECT_COLUMNS)
          .in('hosted_endpoint', [...endpointCandidates])
          .returns<McpRow[]>(),
      ),
    )
  }

  let allRows: McpRow[]
  try {
    const responses = await Promise.all(promises)
    allRows = responses.flatMap((r) => r.data ?? [])
  } catch {
    await logApiRequest(supabase, {
      apiKey: profile.api_key, tool: TOOL, ecosystem: 'mcp', statusCode: 500,
    })
    return Response.json({ error: 'Lookup error' }, { status: 500 })
  }

  const byUrl = new Map<string, McpRow>()
  const byNpm = new Map<string, McpRow>()
  const byEndpoint = new Map<string, McpRow>()
  for (const row of allRows) {
    if (row.url) byUrl.set(row.url, row)
    if (row.npm_package) byNpm.set(row.npm_package, row)
    if (row.hosted_endpoint) byEndpoint.set(row.hosted_endpoint, row)
  }

  const results = identifiers.map((id) => {
    if (!id) {
      const risk = unknownRisk('invalid identifier')
      return {
        found: false, trusted: false, risk_level: risk.level,
        is_quarantined: false, reasons: risk.reasons,
      }
    }
    let row: McpRow | null | undefined = null
    if ('url' in id) {
      for (const candidate of normalizeGitHubUrl(id.url)) {
        row = byUrl.get(candidate)
        if (row) break
      }
    } else if ('npm' in id) {
      row = byNpm.get(id.npm)
    } else if ('endpoint' in id) {
      row = byEndpoint.get(id.endpoint)
    }
    return buildVerifyResult(row ?? null)
  })

  await logApiRequest(supabase, {
    apiKey: profile.api_key, tool: TOOL, ecosystem: 'mcp', statusCode: 200,
  })
  void logQueryAudit(supabase, {
    apiKey: profile.api_key,
    tool: TOOL,
    queryParams: { count: identifiers.length, calls_charged: totalCalls },
    resultIds: allRows.map((r) => r.id),
    resultCount: allRows.length,
    statusCode: 200,
    clientIp,
    latencyMs: Date.now() - t0,
  })

  return Response.json(
    { results },
    { headers: { 'X-Strata-Calls-Charged': String(totalCalls) } },
  )
}
