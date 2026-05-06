// GET /api/v1/anomalies/detect
// Called by the Vercel hourly cron (vercel.json "crons" block).
// Validates X-Cron-Secret header — returns 401 if missing or wrong.
// Processes at most MAX_PROFILES_PER_RUN active profiles per invocation.

import { type NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { runDetectionForProfile } from '@/lib/anomaly-detection'
import { serverTiming } from '@/lib/server-timing'

const MAX_PROFILES_PER_RUN = 50

export async function GET(request: NextRequest) {
  const t0 = Date.now()

  const secret = request.headers.get('x-cron-secret')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || secret !== cronSecret) {
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
