import { type NextRequest } from 'next/server'
import {
  authenticateOrAnon,
  rateLimitHeaders,
  logApiRequest,
  logQueryAudit,
} from '@/lib/api-auth'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { verifyX402Endpoint } from '@/lib/x402-verifier'
import { freshnessEnvelope } from '@/lib/freshness'
import { serverTiming } from '@/lib/server-timing'
import { writeLedgerEntry } from '@/lib/ledger'

const TOOL = 'x402-verify'

export async function GET(request: NextRequest) {
  const t0 = Date.now()
  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null

  const auth = await authenticateOrAnon(request)
  if (!auth.ok) return auth.response

  const url = request.nextUrl.searchParams.get('url')
  if (!url) {
    return Response.json(
      { error: 'url query param required' },
      { status: 400, headers: rateLimitHeaders(auth) },
    )
  }
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return Response.json(
      { error: 'invalid url' },
      { status: 400, headers: rateLimitHeaders(auth) },
    )
  }
  if (parsed.protocol !== 'https:') {
    return Response.json(
      { error: 'url must be https' },
      { status: 400, headers: rateLimitHeaders(auth) },
    )
  }

  const result = await verifyX402Endpoint(parsed.toString())

  const freshness = freshnessEnvelope(result.last_checked_at, result.last_checked_at)
  const body = { ...result, ...freshness }

  const auditKey = auth.mode === 'auth' ? auth.profile.api_key : 'anon'
  const supabase = auth.mode === 'auth' ? auth.supabase : createServiceRoleClient()
  await logApiRequest(supabase, {
    apiKey: auditKey, tool: TOOL, ecosystem: 'x402', statusCode: 200,
  })
  void logQueryAudit(supabase, {
    apiKey: auditKey,
    tool: TOOL,
    queryParams: { url: parsed.toString() },
    statusCode: 200,
    clientIp,
    latencyMs: Date.now() - t0,
  })

  void writeLedgerEntry({
    profileId: auth.mode === 'auth' ? auth.profile.id : null,
    agentId: request.headers.get('x-agent-id'),
    toolCalled: TOOL,
    serverUrl: parsed.toString(),
    parameters: { url: parsed.toString() },
    responseSummary: {
      risk_level: result.risk_level,
      trusted:    result.trusted,
      flags:      result.flags,
    },
    riskLevel: result.risk_level,
    capabilityFlags: result.flags,
    durationMs: Date.now() - t0,
  })

  return Response.json(body, {
    headers: { ...rateLimitHeaders(auth), 'Server-Timing': serverTiming(t0) },
  })
}
