export interface GitHubSignals {
  stars: number
  forks: number
  openIssues: number
  archived: boolean
  isFork: boolean
  licenseSpdx: string | null
  pushedAt: string | null
  lastCommitAt: string | null
  createdAt: string | null
  hasReleases: boolean
  lastReleaseAt: string | null
}

export interface ScoreResult {
  score: number
  components: Record<string, number>
}

function daysSince(iso: string | null): number | null {
  if (!iso) return null
  const ms = Date.now() - new Date(iso).getTime()
  return Math.floor(ms / 86_400_000)
}

function popularityPoints(stars: number): number {
  return Math.min(25, Math.log10(stars + 1) * 8)
}

function maintenancePoints(lastCommitAt: string | null, pushedAt: string | null): number {
  const age = daysSince(lastCommitAt ?? pushedAt)
  if (age === null) return 0
  if (age < 30)  return 15
  if (age < 90)  return 10
  if (age < 180) return  5
  if (age < 365) return  0
  if (age < 730) return -5
  return -15
}

function releasePoints(hasReleases: boolean, lastReleaseAt: string | null): number {
  if (!hasReleases) return 0
  const age = daysSince(lastReleaseAt)
  if (age === null) return 3
  return age < 365 ? 10 : 3
}

function licensePoints(spdx: string | null): number {
  if (!spdx) return -10
  const id = spdx.toUpperCase()
  if (['MIT', 'APACHE-2.0', 'BSD-2-CLAUSE', 'BSD-3-CLAUSE', 'MPL-2.0', 'ISC'].some(l => id.startsWith(l))) return 5
  if (['GPL', 'LGPL', 'AGPL'].some(l => id.startsWith(l))) return 3
  return 1
}

export function computeSecurityScore(signals: GitHubSignals): ScoreResult {
  const base       = 50
  const popularity = popularityPoints(signals.stars)
  const maintenance = maintenancePoints(signals.lastCommitAt, signals.pushedAt)
  const release    = releasePoints(signals.hasReleases, signals.lastReleaseAt)
  const license    = licensePoints(signals.licenseSpdx)
  const archivePenalty = signals.archived ? -25 : 0
  const forkPenalty    = signals.isFork   ? -10 : 0

  const raw = base + popularity + maintenance + release + license + archivePenalty + forkPenalty
  const score = Math.max(0, Math.min(100, Math.round(raw)))

  return {
    score,
    components: {
      base,
      popularity: Math.round(popularity * 10) / 10,
      maintenance,
      release,
      license,
      archivePenalty,
      forkPenalty,
    },
  }
}
