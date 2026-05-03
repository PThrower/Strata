// Shared by app/api/v1/mcp/verify and app/api/v1/mcp/verify-bulk.
// Both routes return the same VerifyResult shape; centralizing here keeps them
// in lockstep and makes the helpers testable in isolation.

import { computeRiskLevel, unknownRisk } from './risk'

export interface McpRow {
  id: string
  name: string
  description: string | null
  url: string | null
  category: string | null
  tags: string[] | null
  security_score: number | null
  runtime_score: number | null
  capability_flags: string[] | null
  hosted_endpoint: string | null
  tool_count: number | null
  stars: number | null
  archived: boolean | null
  runtime_updated_at: string | null
  is_quarantined: boolean | null
  injection_risk_score: number | null
  npm_package: string | null
}

export const VERIFY_SELECT_COLUMNS =
  'id, name, description, url, category, tags, ' +
  'security_score, runtime_score, capability_flags, ' +
  'hosted_endpoint, tool_count, stars, archived, ' +
  'runtime_updated_at, is_quarantined, injection_risk_score, npm_package'

// Returns up to two URL candidates: the canonical owner/repo form, and the
// .git-suffixed variant. mcp_servers stores either depending on source.
export function normalizeGitHubUrl(input: string): string[] {
  let raw = input.trim()
  if (!/^https?:\/\//i.test(raw)) raw = 'https://' + raw
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return [input]
  }
  const host = url.hostname.toLowerCase()
  if (host !== 'github.com' && host !== 'www.github.com') return [input]
  url.hostname = 'github.com'
  url.protocol = 'https:'
  url.search = ''
  url.hash = ''
  const segments = url.pathname.split('/').filter(Boolean)
  if (segments.length < 2) return [input]
  const ownerRepo = segments.slice(0, 2).join('/').replace(/\.git$/i, '')
  const canonical = `https://github.com/${ownerRepo}`
  return [canonical, `${canonical}.git`]
}

export function freshnessBucket(iso: string | null): 'fresh' | 'aging' | 'stale' | 'unknown' {
  if (!iso) return 'unknown'
  const days = (Date.now() - new Date(iso).getTime()) / 86_400_000
  if (days < 14) return 'fresh'
  if (days < 60) return 'aging'
  return 'stale'
}

export function buildVerifyResult(row: McpRow | null): Record<string, unknown> {
  if (!row) {
    const risk = unknownRisk('server not in Strata directory')
    return {
      found: false,
      trusted: false,
      risk_level: risk.level,
      is_quarantined: false,
      reasons: risk.reasons,
    }
  }
  const risk = computeRiskLevel(row)
  return {
    found: true,
    trusted: risk.trusted,
    risk_level: risk.level,
    is_quarantined: row.is_quarantined === true,
    reasons: risk.reasons,
    id: row.id,
    name: row.name,
    description: row.description,
    url: row.url,
    category: row.category,
    security_score: row.security_score,
    runtime_score: row.runtime_score,
    capability_flags: row.capability_flags ?? [],
    hosted_endpoint: row.hosted_endpoint,
    tool_count: row.tool_count,
    runtime_freshness: freshnessBucket(row.runtime_updated_at),
    injection_risk_score: row.injection_risk_score,
  }
}
