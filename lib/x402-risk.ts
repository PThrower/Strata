// x402 endpoint risk scoring — mirrors lib/risk.ts in shape.
// Server-authoritative trust signal for autonomous payment endpoints.

import type { RiskLevel } from './risk'

export interface X402ScoreInput {
  ssl_valid:          boolean | null
  domain_age_days:    number  | null
  payment_amount_usd: number  | null
  raw_402_response:   Record<string, unknown> | null
  first_seen_at:      string  | null
  flags:              string[] | null
}

export interface X402RiskInput {
  is_quarantined: boolean | null
  security_score: number  | null
  flags:          string[] | null
}

export interface X402Assessment {
  level:   RiskLevel
  flags:   string[]
  trusted: boolean
}

// A 402 body is "well-formed" when the four core x402 fields are present.
// `asset` is intentionally optional — schemes like USDC may carry it, ETH
// payments often don't.
const REQUIRED_402_FIELDS = ['scheme', 'network', 'maxAmountRequired', 'payTo'] as const

function isWellFormed402(body: Record<string, unknown> | null): boolean {
  if (!body) return false
  return REQUIRED_402_FIELDS.every((f) => f in body)
}

const SEVEN_DAYS_MS = 7 * 86_400_000

export function computeX402Score(row: X402ScoreInput): number {
  let score = 0

  if (row.ssl_valid === true) score += 20

  const age = row.domain_age_days
  if (age != null) {
    if (age > 365) score += 25
    else if (age > 90) score += 15
    else if (age > 30) score += 5
  }

  // Currency conversion is a future improvement; we treat the raw
  // maxAmountRequired as USD for v1.
  const amt = row.payment_amount_usd
  if (amt != null) {
    if (amt <= 0.10) score += 15
    else if (amt <= 1.00) score += 10
    else if (amt <= 5.00) score += 5
  }

  if (isWellFormed402(row.raw_402_response)) score += 15

  if (row.first_seen_at) {
    const ageMs = Date.now() - new Date(row.first_seen_at).getTime()
    if (ageMs > SEVEN_DAYS_MS) score += 10
  }

  const flags = row.flags ?? []
  if (flags.length === 0) score += 15
  else score -= 10 * flags.length

  return Math.max(0, Math.min(100, score))
}

const HIGH_RISK_FLAGS   = ['ssl_invalid', 'known_fraud'] as const
const MEDIUM_RISK_FLAGS = ['drain_risk', 'mismatched_capability'] as const

export function computeX402RiskLevel(row: X402RiskInput): X402Assessment {
  const flags = row.flags ?? []

  if (
    row.is_quarantined === true ||
    (row.security_score !== null && row.security_score < 20)
  ) {
    return { level: 'critical', flags, trusted: false }
  }
  if (HIGH_RISK_FLAGS.some((f) => flags.includes(f))) {
    return { level: 'high', flags, trusted: false }
  }
  if (MEDIUM_RISK_FLAGS.some((f) => flags.includes(f))) {
    return { level: 'medium', flags, trusted: false }
  }
  return { level: 'low', flags, trusted: true }
}
