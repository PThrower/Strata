// Backfill / refresh security scores for all mcp_servers rows.
// Safe to interrupt and re-run — each row is checkpointed immediately after scoring.
//
// Usage:
//   export $(grep -v '^#' .env.local | xargs)
//   npx tsx scripts/score-mcp-security.ts
//
// Optional env:
//   SCORE_LIMIT=100   — process at most N rows this run (default: all)
//   SCORE_STALE_DAYS=7 — re-score rows older than N days (default: 7)

import { getServiceClient } from './refresh/writer'
import { parseGitHubUrl, fetchGitHubSignals, RateLimiter, type ScoreStatus } from './refresh/github-security'
import { computeSecurityScore } from './refresh/security-score'

const BOLD  = '\x1b[1m'
const DIM   = '\x1b[2m'
const GREEN = '\x1b[38;2;0;196;114m'
const YELLOW = '\x1b[38;2;245;158;11m'
const RED   = '\x1b[38;2;239;68;68m'
const RESET = '\x1b[0m'

const STALE_DAYS = parseInt(process.env.SCORE_STALE_DAYS ?? '7', 10)
const LIMIT = process.env.SCORE_LIMIT ? parseInt(process.env.SCORE_LIMIT, 10) : null

interface McpRow {
  id: string
  url: string | null
}

async function main() {
  const supabase = getServiceClient()
  const limiter = new RateLimiter()

  if (!process.env.GITHUB_TOKEN) {
    console.warn(`${YELLOW}⚠ GITHUB_TOKEN not set — using unauthenticated (60 req/hr limit)${RESET}`)
  }

  // Fetch candidates: unscored or stale or previously soft-failed
  let query = supabase
    .from('mcp_servers')
    .select('id, url')
    .or(
      `score_updated_at.is.null,` +
      `score_updated_at.lt.${new Date(Date.now() - STALE_DAYS * 86_400_000).toISOString()},` +
      `score_status.in.(error_rate_limited,error_transient)`,
    )
    .order('id')

  if (LIMIT) query = query.limit(LIMIT)

  const { data: rows, error } = await query
  if (error) throw new Error(`Failed to fetch candidates: ${error.message}`)

  const total = (rows ?? []).length
  console.log(`\n${BOLD}Scoring ${total} MCP servers${RESET}  ${DIM}(stale_days=${STALE_DAYS}${LIMIT ? `, limit=${LIMIT}` : ''})${RESET}\n`)

  const counts: Record<ScoreStatus | 'not_github', number> = {
    scored: 0,
    not_github: 0,
    not_found: 0,
    archived: 0,
    error_rate_limited: 0,
    error_transient: 0,
    error_permanent: 0,
  }

  for (let i = 0; i < (rows ?? []).length; i++) {
    const row = (rows as McpRow[])[i]
    const prefix = `[${String(i + 1).padStart(String(total).length)}/${total}]`

    if (!row.url) {
      await checkpoint(supabase, row.id, 'not_github')
      counts['not_github']++
      console.log(`${DIM}${prefix}${RESET} ${DIM}no url — skipped${RESET}`)
      continue
    }

    const parsed = parseGitHubUrl(row.url)
    if (!parsed) {
      await checkpoint(supabase, row.id, 'not_github')
      counts['not_github']++
      console.log(`${DIM}${prefix} not_github  ${row.url}${RESET}`)
      continue
    }

    const { owner, repo } = parsed
    const result = await fetchGitHubSignals(owner, repo, limiter)

    if (result.status === 'scored' && result.signals) {
      const { score, components } = computeSecurityScore(result.signals)
      const { error: upErr } = await supabase
        .from('mcp_servers')
        .update({
          security_score:   score,
          stars:            result.signals.stars,
          forks:            result.signals.forks,
          open_issues:      result.signals.openIssues,
          archived:         result.signals.archived,
          is_fork:          result.signals.isFork,
          license_spdx:     result.signals.licenseSpdx,
          pushed_at:        result.signals.pushedAt,
          last_commit_at:   result.signals.lastCommitAt,
          last_release_at:  result.signals.lastReleaseAt,
          has_releases:     result.signals.hasReleases,
          gh_owner:         owner,
          gh_repo:          repo,
          score_updated_at: new Date().toISOString(),
          score_status:     'scored',
          score_components: components,
        })
        .eq('id', row.id)
      if (upErr) console.error(`  ${RED}update failed: ${upErr.message}${RESET}`)
      counts.scored++
      const scoreColor = score >= 60 ? GREEN : score >= 40 ? YELLOW : RED
      console.log(`${DIM}${prefix}${RESET} ${scoreColor}${String(score).padStart(3)}${RESET}  ${DIM}⭐${result.signals.stars}${RESET}  ${owner}/${repo}`)
    } else {
      await checkpoint(supabase, row.id, result.status)
      counts[result.status]++
      const label = result.status === 'not_found' ? RED :
                    result.status === 'archived'  ? YELLOW : RED
      console.log(`${DIM}${prefix}${RESET} ${label}${result.status}${RESET}  ${owner}/${repo}`)
    }
  }

  console.log(`\n${BOLD}Done.${RESET}`)
  console.log(`  ${GREEN}scored${RESET}           ${counts.scored}`)
  console.log(`  ${DIM}not_github${RESET}       ${counts.not_github}`)
  console.log(`  ${DIM}not_found${RESET}        ${counts.not_found}`)
  console.log(`  ${YELLOW}archived${RESET}         ${counts.archived}`)
  console.log(`  ${RED}error_rate_limited${RESET} ${counts.error_rate_limited}`)
  console.log(`  ${RED}error_transient${RESET}    ${counts.error_transient}`)
  console.log(`  ${RED}error_permanent${RESET}    ${counts.error_permanent}`)
}

async function checkpoint(
  supabase: ReturnType<typeof getServiceClient>,
  id: string,
  status: string,
) {
  await supabase
    .from('mcp_servers')
    .update({ score_status: status, score_updated_at: new Date().toISOString() })
    .eq('id', id)
}

main().catch((err) => {
  console.error(`${RED}Fatal: ${err}${RESET}`)
  process.exit(1)
})
