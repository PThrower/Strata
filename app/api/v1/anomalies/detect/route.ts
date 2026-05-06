// GET /api/v1/anomalies/detect
// Called by the Vercel hourly cron (vercel.json "crons" block).
// Auth: accepts both Vercel's automatic cron auth and manual trigger header.
//   - Vercel cron sends:      Authorization: Bearer ${CRON_SECRET}
//   - Manual triggers send:   X-Cron-Secret: ${CRON_SECRET}
// Returns 401 if neither header matches or CRON_SECRET is unset.

import { timingSafeEqual } from 'crypto'
import { type NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { runDetectionForProfile } from '@/lib/anomaly-detection'
import { serverTiming } from '@/lib/server-timing'

export const maxDuration = 300

const MAX_PROFILES_PER_RUN = 50

function constantTimeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  return timingSafeEqual(Buffer.from(a), Buffer.from(b))
}

export async function GET(request: NextRequest) {
  const t0 = Date.now()

  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Accept both Vercel's Bearer pattern and the X-Cron-Secret custom header.
  // Constant-time comparison prevents timing side-channel attacks.
  const authHeader   = request.headers.get('authorization') ?? ''
  const bearerMatch  = authHeader.match(/^Bearer\s+(.+)$/i)
  const bearerSecret = bearerMatch ? bearerMatch[1] : ''
  const customSecret = request.headers.get('x-cron-secret') ?? ''

  const ok =
    (bearerSecret.length > 0 && constantTimeEquals(bearerSecret, cronSecret)) ||
    (customSecret.length > 0 && constantTimeEquals(customSecret, cronSecret))

  if (!ok) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceRoleClient()

  // Find profiles that had ledger activity in the last 2 hours
  const twoHoursAgo = new Date(Date.now() - 2 * 3_600_000).toISOString()
  const { data: activeRows } = await supabase
    .from('agent_activity_ledger')
    .select('profile_id')
    .gte('created_at', twoHoursAgo)
    .not('profile_id', 'is', null)
    .limit(MAX_PROFILES_PER_RUN * 5)

  const profileIds = [
    ...new Set(
      (activeRows ?? []).map((r: { profile_id: string }) => r.profile_id).filter(Boolean)
    ),
  ].slice(0, MAX_PROFILES_PER_RUN) as string[]

  let totalDetected = 0

  for (const profileId of profileIds) {
    try {
      const { detected } = await runDetectionForProfile(supabase, profileId)
      totalDetected += detected
    } catch (err) {
      console.error(`[anomaly-detect] profile ${profileId}:`, err)
    }
  }

  // Prune baselines older than 48 hours to keep the table small
  await supabase
    .from('anomaly_baselines')
    .delete()
    .lt('updated_at', new Date(Date.now() - 48 * 3_600_000).toISOString())
    .then(() => {}, (err: unknown) => console.error('[anomaly-detect] prune:', err))

  return Response.json(
    { profiles_processed: profileIds.length, anomalies_detected: totalDetected },
    { headers: { 'Server-Timing': serverTiming(t0) } },
  )
}
