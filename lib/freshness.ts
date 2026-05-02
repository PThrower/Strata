export type FreshnessBucket = 'live' | 'recent' | 'stale' | 'very_stale'

export interface FreshnessEnvelope {
  content_age_hours: number
  last_verified_at: string
  data_freshness: FreshnessBucket
}

export function freshnessEnvelope(
  publishedAt: string,
  lastVerifiedAt: string | null,
): FreshnessEnvelope {
  const ageMs = Date.now() - new Date(publishedAt).getTime()
  const ageHours = Math.round(ageMs / 3.6e6)
  const bucket: FreshnessBucket =
    ageHours < 12 ? 'live'
    : ageHours < 48 ? 'recent'
    : ageHours < 168 ? 'stale'
    : 'very_stale'
  return {
    content_age_hours: ageHours,
    last_verified_at: lastVerifiedAt ?? publishedAt,
    data_freshness: bucket,
  }
}
