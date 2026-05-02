import type { GitHubSignals } from './security-score'

export type ScoreStatus =
  | 'scored'
  | 'not_github'
  | 'not_found'
  | 'archived'
  | 'error_rate_limited'
  | 'error_transient'
  | 'error_permanent'

export interface FetchSignalsResult {
  status: ScoreStatus
  signals?: GitHubSignals
}

const GH_API = 'https://api.github.com'
const GH_VERSION = '2022-11-28'
const BASELINE_DELAY_MS = 750
const LOW_REMAINING_THRESHOLD = 100

function ghHeaders(): Record<string, string> {
  const h: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': GH_VERSION,
  }
  if (process.env.GITHUB_TOKEN) {
    h.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`
  }
  return h
}

export class RateLimiter {
  private lastCallAt = 0

  async wait(remaining: number | null, resetAt: number | null): Promise<void> {
    if (remaining !== null && remaining < LOW_REMAINING_THRESHOLD && resetAt !== null) {
      const sleepMs = Math.max(0, resetAt * 1000 - Date.now()) + 500
      await sleep(sleepMs)
      return
    }
    const elapsed = Date.now() - this.lastCallAt
    if (elapsed < BASELINE_DELAY_MS) {
      await sleep(BASELINE_DELAY_MS - elapsed)
    }
    this.lastCallAt = Date.now()
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

function parseRateLimitHeaders(resp: Response): { remaining: number | null; resetAt: number | null } {
  const remaining = resp.headers.get('X-RateLimit-Remaining')
  const reset = resp.headers.get('X-RateLimit-Reset')
  return {
    remaining: remaining ? parseInt(remaining, 10) : null,
    resetAt: reset ? parseInt(reset, 10) : null,
  }
}

async function ghFetch(
  url: string,
  limiter: RateLimiter,
  maxRetries = 3,
): Promise<{ resp: Response; status: 'ok' | 'not_found' | 'rate_limited' | 'transient' | 'permanent' }> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    await limiter.wait(null, null)

    let resp: Response
    try {
      resp = await fetch(url, {
        headers: ghHeaders(),
        signal: AbortSignal.timeout(10_000),
      })
    } catch {
      if (attempt < maxRetries) {
        await sleep(1000 * Math.pow(2, attempt))
        continue
      }
      return { resp: new Response(null, { status: 0 }), status: 'transient' }
    }

    const { remaining, resetAt } = parseRateLimitHeaders(resp)
    await limiter.wait(remaining, resetAt)

    if (resp.ok)                          return { resp, status: 'ok' }
    if (resp.status === 404)              return { resp, status: 'not_found' }
    if (resp.status === 403 || resp.status === 429) {
      if (attempt < maxRetries) {
        const retryAfter = resp.headers.get('Retry-After')
        const waitMs = retryAfter
          ? parseInt(retryAfter, 10) * 1000
          : Math.max(0, (resetAt ?? 0) * 1000 - Date.now()) + 1000
        await sleep(waitMs)
        continue
      }
      return { resp, status: 'rate_limited' }
    }
    if (resp.status >= 500 && attempt < maxRetries) {
      await sleep(1000 * Math.pow(2, attempt))
      continue
    }
    return { resp, status: resp.status >= 500 ? 'transient' : 'permanent' }
  }
  return { resp: new Response(null, { status: 0 }), status: 'transient' }
}

export function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  try {
    const u = new URL(url)
    if (u.hostname !== 'github.com') return null
    const parts = u.pathname.replace(/^\//, '').split('/')
    if (parts.length < 2 || !parts[0] || !parts[1]) return null
    return { owner: parts[0], repo: parts[1].replace(/\.git$/, '') }
  } catch {
    return null
  }
}

interface GhRepoResponse {
  stargazers_count: number
  forks_count: number
  open_issues_count: number
  archived: boolean
  fork: boolean
  pushed_at: string | null
  created_at: string | null
  default_branch: string
  license: { spdx_id: string | null } | null
}

interface GhReleaseResponse {
  published_at: string
}

interface GhCommitResponse {
  commit: { committer: { date: string } | null; author: { date: string } | null }
}

export async function fetchGitHubSignals(
  owner: string,
  repo: string,
  limiter: RateLimiter,
): Promise<FetchSignalsResult> {
  // Call 1 — repo metadata
  const { resp: repoResp, status: repoStatus } = await ghFetch(
    `${GH_API}/repos/${owner}/${repo}`,
    limiter,
  )
  if (repoStatus === 'not_found') return { status: 'not_found' }
  if (repoStatus === 'rate_limited') return { status: 'error_rate_limited' }
  if (repoStatus === 'transient') return { status: 'error_transient' }
  if (repoStatus === 'permanent') return { status: 'error_permanent' }

  const repoData: GhRepoResponse = await repoResp.json()

  // Call 2 — latest release (404 = no releases, not an error)
  const { resp: releaseResp, status: releaseStatus } = await ghFetch(
    `${GH_API}/repos/${owner}/${repo}/releases/latest`,
    limiter,
  )
  if (releaseStatus === 'rate_limited') return { status: 'error_rate_limited' }
  if (releaseStatus === 'transient')    return { status: 'error_transient' }

  const hasReleases = releaseStatus === 'ok'
  let lastReleaseAt: string | null = null
  if (hasReleases) {
    const releaseData: GhReleaseResponse = await releaseResp.json()
    lastReleaseAt = releaseData.published_at ?? null
  }

  // Call 3 — most recent commit on default branch
  const { resp: commitResp, status: commitStatus } = await ghFetch(
    `${GH_API}/repos/${owner}/${repo}/commits?per_page=1&sha=${repoData.default_branch}`,
    limiter,
  )
  if (commitStatus === 'rate_limited') return { status: 'error_rate_limited' }
  if (commitStatus === 'transient')    return { status: 'error_transient' }

  let lastCommitAt: string | null = null
  if (commitStatus === 'ok') {
    const commits: GhCommitResponse[] = await commitResp.json()
    if (commits.length > 0) {
      lastCommitAt =
        commits[0].commit.committer?.date ??
        commits[0].commit.author?.date ??
        null
    }
  }

  const signals: GitHubSignals = {
    stars:        repoData.stargazers_count,
    forks:        repoData.forks_count,
    openIssues:   repoData.open_issues_count,
    archived:     repoData.archived,
    isFork:       repoData.fork,
    licenseSpdx:  repoData.license?.spdx_id ?? null,
    pushedAt:     repoData.pushed_at,
    lastCommitAt,
    createdAt:    repoData.created_at,
    hasReleases,
    lastReleaseAt,
  }

  return { status: 'scored', signals }
}
