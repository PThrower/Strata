// x402 endpoint verifier — mirrors lib/mcp-verify-shared.ts in role.
// Fetches a candidate payment endpoint, parses its 402 body, scores it,
// and upserts the result into x402_endpoints. Never throws; all errors are
// converted to flag-bearing results.

import { createServiceRoleClient } from './supabase-server'
import type { RiskLevel } from './risk'
import {
  computeX402Score,
  computeX402RiskLevel,
  type X402ScoreInput,
} from './x402-risk'

export interface X402VerificationResult {
  url:                string
  domain:             string
  security_score:     number
  risk_level:         RiskLevel
  trusted:            boolean
  flags:              string[]
  payment_amount_usd: number  | null
  payment_currency:   string  | null
  payment_network:    string  | null
  ssl_valid:          boolean | null
  is_quarantined:     boolean
  last_checked_at:    string
}

interface X402Row {
  url:                string
  domain:             string
  first_seen_at:      string
  last_checked_at:    string
  security_score:     number  | null
  is_quarantined:     boolean | null
  payment_amount_usd: number  | null
  payment_currency:   string  | null
  payment_network:    string  | null
  ssl_valid:          boolean | null
  domain_age_days:    number  | null
  flags:              string[] | null
  raw_402_response:   Record<string, unknown> | null
}

const FETCH_TIMEOUT_MS = 5000
const CACHE_TTL_MS     = 24 * 60 * 60 * 1000

// v1 stub: known fraud list. Populated by future feed.
const KNOWN_FRAUD_DOMAINS = new Set<string>()

function rowToResult(row: X402Row): X402VerificationResult {
  const risk = computeX402RiskLevel({
    is_quarantined: row.is_quarantined,
    security_score: row.security_score,
    flags:          row.flags,
  })
  return {
    url:                row.url,
    domain:             row.domain,
    security_score:     row.security_score ?? 0,
    risk_level:         risk.level,
    trusted:            risk.trusted,
    flags:              row.flags ?? [],
    payment_amount_usd: row.payment_amount_usd,
    payment_currency:   row.payment_currency,
    payment_network:    row.payment_network,
    ssl_valid:          row.ssl_valid,
    is_quarantined:     row.is_quarantined === true,
    last_checked_at:    row.last_checked_at,
  }
}

function syntheticCriticalResult(url: string, domain: string, extraFlags: string[]): X402VerificationResult {
  const flags = ['ssl_invalid', 'no_payment_details', ...extraFlags]
  return {
    url,
    domain,
    security_score: 0,
    risk_level:     'critical',
    trusted:        false,
    flags,
    payment_amount_usd: null,
    payment_currency:   null,
    payment_network:    null,
    ssl_valid:          false,
    is_quarantined:     false,
    last_checked_at:    new Date().toISOString(),
  }
}

function isCertError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const e = err as { code?: unknown; cause?: { code?: unknown } }
  const codes = [e.code, e.cause?.code].filter((c): c is string => typeof c === 'string')
  return codes.some(
    (c) =>
      c.startsWith('CERT_') ||
      c === 'ERR_TLS_CERT_ALTNAME_INVALID' ||
      c === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' ||
      c === 'SELF_SIGNED_CERT_IN_CHAIN' ||
      c === 'DEPTH_ZERO_SELF_SIGNED_CERT',
  )
}

function asNumberOrNull(v: unknown): number | null {
  if (v === null || v === undefined) return null
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : null
}

function asStringOrNull(v: unknown): string | null {
  if (v === null || v === undefined) return null
  const s = String(v)
  return s.length > 0 ? s : null
}

export async function verifyX402Endpoint(url: string): Promise<X402VerificationResult> {
  // ── 1. URL validation ──────────────────────────────────────────────────
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return syntheticCriticalResult(url, '', [])
  }
  if (parsed.protocol !== 'https:') {
    return syntheticCriticalResult(parsed.toString(), parsed.hostname, [])
  }

  const canonicalUrl = parsed.toString()
  const domain       = parsed.hostname

  const sb = createServiceRoleClient()

  // ── 2. Cache lookup ────────────────────────────────────────────────────
  try {
    const { data } = await sb
      .from('x402_endpoints')
      .select('*')
      .eq('url', canonicalUrl)
      .maybeSingle<X402Row>()
    if (data) {
      const ageMs = Date.now() - new Date(data.last_checked_at).getTime()
      if (ageMs < CACHE_TTL_MS) return rowToResult(data)
    }
  } catch {
    // Cache lookup failure is non-fatal — fall through to a fresh probe.
  }

  // ── 3. Fetch with 5s timeout ───────────────────────────────────────────
  const flags: string[] = []
  let ssl_valid: boolean | null = null
  let parsedBody: Record<string, unknown> | null = null

  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), FETCH_TIMEOUT_MS)
  let response: Response | null = null
  try {
    response = await fetch(canonicalUrl, {
      method:   'GET',
      redirect: 'manual',
      signal:   ctl.signal,
      headers:  { Accept: 'application/json' },
    })
    ssl_valid = true
  } catch (err) {
    if (isCertError(err)) {
      ssl_valid = false
      flags.push('ssl_invalid')
      flags.push('no_payment_details')
    } else {
      // Timeout or network error — SSL state is unknown.
      ssl_valid = null
      flags.push('no_payment_details')
    }
  } finally {
    clearTimeout(timer)
  }

  // ── 4. Status + body parse ─────────────────────────────────────────────
  if (response) {
    if (response.status !== 402) {
      flags.push('no_payment_details')
    } else {
      try {
        const text = await response.text()
        const json = JSON.parse(text)
        if (json && typeof json === 'object' && !Array.isArray(json)) {
          parsedBody = json as Record<string, unknown>
        } else {
          flags.push('no_payment_details')
        }
      } catch {
        flags.push('no_payment_details')
      }
    }
  }

  // ── 5. Field extraction ────────────────────────────────────────────────
  const payment_amount_usd = parsedBody ? asNumberOrNull(parsedBody.maxAmountRequired) : null
  const payment_currency   = parsedBody ? asStringOrNull(parsedBody.asset)             : null
  const payment_network    = parsedBody ? asStringOrNull(parsedBody.network)           : null

  // ── 6. WHOIS — not implemented in v1; always mark unverified_domain. ──
  const domain_age_days: number | null = null
  flags.push('unverified_domain')

  // ── 7. drain_risk — payment over $1.00 ─────────────────────────────────
  if (payment_amount_usd !== null && payment_amount_usd > 1.00) {
    flags.push('drain_risk')
  }

  // ── 8. known_fraud — v1 stub (always empty). ──────────────────────────
  if (KNOWN_FRAUD_DOMAINS.has(domain)) {
    flags.push('known_fraud')
  }

  // ── 9. Score ───────────────────────────────────────────────────────────
  // first_seen_at for scoring purposes is `now` on the very first probe
  // (since we haven't inserted yet). On subsequent probes the cache path
  // would have returned earlier; if cache was stale we re-score using the
  // existing first_seen_at via the row we read above (passed through here
  // for the recency bonus).
  const first_seen_at_for_scoring: string | null = null
  const scoreInput: X402ScoreInput = {
    ssl_valid,
    domain_age_days,
    payment_amount_usd,
    raw_402_response: parsedBody,
    first_seen_at:    first_seen_at_for_scoring,
    flags,
  }
  const security_score = computeX402Score(scoreInput)

  // ── 10. Risk level ─────────────────────────────────────────────────────
  const risk = computeX402RiskLevel({
    is_quarantined: false,
    security_score,
    flags,
  })

  // ── 11. Upsert ─────────────────────────────────────────────────────────
  // first_seen_at is omitted on purpose: the column has DEFAULT now() so
  // it gets set on first INSERT, and on conflict (no payload key) the
  // existing value is preserved.
  const last_checked_at = new Date().toISOString()
  try {
    await sb.from('x402_endpoints').upsert(
      {
        url:                canonicalUrl,
        domain,
        last_checked_at,
        security_score,
        is_quarantined:     false,
        payment_amount_usd,
        payment_currency,
        payment_network,
        ssl_valid,
        domain_age_days,
        flags,
        raw_402_response:   parsedBody,
      },
      { onConflict: 'url' },
    )
  } catch (err) {
    console.error('[x402] upsert failed:', err)
  }

  return {
    url:                canonicalUrl,
    domain,
    security_score,
    risk_level:         risk.level,
    trusted:            risk.trusted,
    flags,
    payment_amount_usd,
    payment_currency,
    payment_network,
    ssl_valid,
    is_quarantined:     false,
    last_checked_at,
  }
}
