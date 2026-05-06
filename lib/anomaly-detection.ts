// Behavioral anomaly detection — baseline computation + three signal detectors.
// Called by the hourly cron route (app/api/v1/anomalies/detect).

import type { ServiceClient } from './api-auth'

// ── Config ────────────────────────────────────────────────────────────────────

const BASELINE_DAYS         = 30
const BASELINE_LAG_HOURS    = 2    // exclude last N hours from baseline so current activity doesn't skew it
const DETECTION_WINDOW_HOURS = 1
const MIN_SAMPLE_COUNT      = 50
const MIN_DAYS_WITH_DATA    = 7
const MAX_LEDGER_ROWS       = 10_000
const DEDUP_WINDOW_MS       = 6 * 3_600_000
const DANGEROUS_FLAGS       = new Set(['shell_exec', 'dynamic_eval'])

// ── Types ─────────────────────────────────────────────────────────────────────

type LedgerRow = {
  created_at:       string
  risk_level:       string | null
  capability_flags: string[] | null
  server_url:       string | null
}

type Baseline = {
  avgCallsByHourSlot:      number[]  // [24], indexed by UTC hour
  avgDailyCalls:           number
  highRiskRate:            number
  netEgressRate:           number
  dangerousFlagRate:       number
  avgUniqueServersPerHour: number
  sampleCount:             number
  daysWithData:            number
}

export type DetectedAnomaly = {
  profileId:            string
  agentId:              string | null
  eventType:            'volume_spike' | 'high_risk_surge' | 'net_egress_surge'
  severity:             'critical' | 'high' | 'medium' | 'low'
  currentValue:         number
  baselineValue:        number
  multiplier:           number
  detail:               string
  windowStart:          string
  windowEnd:            string
  affectedServerUrls:   string[]
}

// ── Baseline computation ──────────────────────────────────────────────────────

function computeBaseline(rows: LedgerRow[], windowDays: number): Baseline {
  const countsByHourSlot  = new Array(24).fill(0) as number[]
  const daySet            = new Set<string>()
  const hourlyServerSets  = new Map<string, Set<string>>()
  let highRiskCount = 0, netEgressCount = 0, dangerousFlagCount = 0

  for (const row of rows) {
    const d        = new Date(row.created_at)
    const hourSlot = d.getUTCHours()
    const dayKey   = `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`
    const hourKey  = `${dayKey}-${hourSlot}`

    countsByHourSlot[hourSlot]++
    daySet.add(dayKey)

    if (row.risk_level === 'high' || row.risk_level === 'critical') highRiskCount++
    if (row.capability_flags?.includes('net_egress')) netEgressCount++
    if (row.capability_flags?.some(f => DANGEROUS_FLAGS.has(f))) dangerousFlagCount++

    if (row.server_url) {
      if (!hourlyServerSets.has(hourKey)) hourlyServerSets.set(hourKey, new Set())
      hourlyServerSets.get(hourKey)!.add(row.server_url)
    }
  }

  const total               = rows.length
  const uniqueServerCounts  = [...hourlyServerSets.values()].map(s => s.size)

  return {
    avgCallsByHourSlot:      countsByHourSlot.map(c => c / Math.max(windowDays, 1)),
    avgDailyCalls:           total / Math.max(windowDays, 1),
    highRiskRate:            total > 0 ? highRiskCount / total : 0,
    netEgressRate:           total > 0 ? netEgressCount / total : 0,
    dangerousFlagRate:       total > 0 ? dangerousFlagCount / total : 0,
    avgUniqueServersPerHour: uniqueServerCounts.length > 0
      ? uniqueServerCounts.reduce((a, b) => a + b, 0) / uniqueServerCounts.length
      : 0,
    sampleCount:   total,
    daysWithData:  daySet.size,
  }
}

// ── Detectors ─────────────────────────────────────────────────────────────────

function runDetectors(
  profileId:        string,
  baseline:         Baseline,
  currentRows:      LedgerRow[],
  windowStart:      Date,
  windowEnd:        Date,
  recentEventTypes: Set<string>,
): DetectedAnomaly[] {
  // Require sufficient history before firing any alerts
  if (baseline.sampleCount < MIN_SAMPLE_COUNT)  return []
  if (baseline.daysWithData < MIN_DAYS_WITH_DATA) return []

  const events        = [] as DetectedAnomaly[]
  const total         = currentRows.length
  const currentHour   = windowStart.getUTCHours()
  // Use a floor of 0.1 so near-zero baseline hours don't generate infinite multipliers
  const baselineSlot  = Math.max(baseline.avgCallsByHourSlot[currentHour], 0.1)
  const isOffHours    = baseline.avgCallsByHourSlot[currentHour] < 0.5

  const serverUrls = [...new Set(
    currentRows.map(r => r.server_url).filter((u): u is string => Boolean(u))
  )].slice(0, 10)

  const ws = windowStart.toISOString()
  const we = windowEnd.toISOString()

  // ── Detector A: Volume spike ────────────────────────────────────────────────
  // Fires when calls_last_hour > 5× baseline AND > 10 absolute.
  if (!recentEventTypes.has('volume_spike') && total > 10) {
    const multiplier = total / baselineSlot
    if (multiplier >= 5) {
      events.push({
        profileId, agentId: null,
        eventType:    'volume_spike',
        severity:     multiplier >= 10 ? 'high' : 'medium',
        currentValue: total,
        baselineValue: round2(baselineSlot),
        multiplier:   round2(multiplier),
        detail:       `${total} calls in the last hour vs baseline ${baselineSlot.toFixed(1)} — ${multiplier.toFixed(1)}× normal`,
        windowStart: ws, windowEnd: we,
        affectedServerUrls: serverUrls,
      })
    }
  }

  // ── Detector B: High-risk surge ─────────────────────────────────────────────
  // Fires when high/critical rate this hour > 3× baseline AND > 5 absolute high-risk calls.
  const highRiskCount = currentRows.filter(
    r => r.risk_level === 'high' || r.risk_level === 'critical'
  ).length
  if (!recentEventTypes.has('high_risk_surge') && total >= 5 && highRiskCount >= 5) {
    const currentRate  = highRiskCount / total
    const baselineRate = Math.max(baseline.highRiskRate, 0.01)
    const multiplier   = currentRate / baselineRate
    if (multiplier >= 3) {
      const highRiskServers = [...new Set(
        currentRows
          .filter(r => (r.risk_level === 'high' || r.risk_level === 'critical') && r.server_url)
          .map(r => r.server_url as string)
      )].slice(0, 10)
      events.push({
        profileId, agentId: null,
        eventType:    'high_risk_surge',
        severity:     'high',
        currentValue: round3(currentRate),
        baselineValue: round3(baseline.highRiskRate),
        multiplier:   round2(multiplier),
        detail:       `${highRiskCount} of ${total} calls touched high/critical servers (${pct(currentRate)}%) vs baseline ${pct(baseline.highRiskRate)}%`,
        windowStart: ws, windowEnd: we,
        affectedServerUrls: highRiskServers,
      })
    }
  }

  // ── Detector C: Net-egress surge ────────────────────────────────────────────
  // Fires when net_egress calls this hour > 3× expected AND > 5 absolute.
  // Off-hours elevates to high severity.
  const netEgressCount = currentRows.filter(r => r.capability_flags?.includes('net_egress')).length
  if (!recentEventTypes.has('net_egress_surge') && netEgressCount >= 5) {
    const baselineEgressPerHour = Math.max(baseline.netEgressRate * baselineSlot, 0.1)
    const multiplier = netEgressCount / baselineEgressPerHour
    if (multiplier >= 3) {
      const egressServers = [...new Set(
        currentRows
          .filter(r => r.capability_flags?.includes('net_egress') && r.server_url)
          .map(r => r.server_url as string)
      )].slice(0, 10)
      events.push({
        profileId, agentId: null,
        eventType:    'net_egress_surge',
        severity:     isOffHours ? 'high' : 'medium',
        currentValue: netEgressCount,
        baselineValue: round2(baselineEgressPerHour),
        multiplier:   round2(multiplier),
        detail:       `${netEgressCount} calls to net_egress servers this hour vs baseline ${baselineEgressPerHour.toFixed(1)}${isOffHours ? ' (off-hours)' : ''}`,
        windowStart: ws, windowEnd: we,
        affectedServerUrls: egressServers,
      })
    }
  }

  return events
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function runDetectionForProfile(
  supabase:  ServiceClient,
  profileId: string,
): Promise<{ detected: number }> {
  const now          = new Date()
  const windowEnd    = now
  const windowStart  = new Date(now.getTime() - DETECTION_WINDOW_HOURS * 3_600_000)
  const baselineEnd  = new Date(now.getTime() - BASELINE_LAG_HOURS * 3_600_000)
  const baselineStart = new Date(baselineEnd.getTime() - BASELINE_DAYS * 86_400_000)

  // Single ledger query covers both baseline and current windows
  const { data: allRows } = await supabase
    .from('agent_activity_ledger')
    .select('created_at, risk_level, capability_flags, server_url')
    .eq('profile_id', profileId)
    .gte('created_at', baselineStart.toISOString())
    .order('created_at', { ascending: false })
    .limit(MAX_LEDGER_ROWS)

  const rows         = (allRows ?? []) as LedgerRow[]
  const baselineRows = rows.filter(r => r.created_at <  baselineEnd.toISOString())
  const currentRows  = rows.filter(r => r.created_at >= windowStart.toISOString())

  const baseline = computeBaseline(baselineRows, BASELINE_DAYS)

  // Store baseline (no uniqueness constraint — pruned separately after 48h)
  await supabase.from('anomaly_baselines').insert({
    profile_id:                  profileId,
    agent_id:                    null,
    avg_calls_by_hour_slot:      baseline.avgCallsByHourSlot,
    avg_daily_calls:             baseline.avgDailyCalls,
    high_risk_rate:              baseline.highRiskRate,
    net_egress_rate:             baseline.netEgressRate,
    dangerous_flag_rate:         baseline.dangerousFlagRate,
    avg_unique_servers_per_hour: baseline.avgUniqueServersPerHour,
    baseline_start:              baselineStart.toISOString(),
    baseline_end:                baselineEnd.toISOString(),
    sample_count:                baseline.sampleCount,
    days_with_data:              baseline.daysWithData,
  }).then(() => {}, (err: unknown) => console.error('[anomaly] baseline insert:', err))

  // Skip detection if insufficient history
  if (baseline.sampleCount < MIN_SAMPLE_COUNT || baseline.daysWithData < MIN_DAYS_WITH_DATA) {
    return { detected: 0 }
  }

  // Dedup: skip event types that already have an unacknowledged event in the last 6h
  const dedupSince = new Date(now.getTime() - DEDUP_WINDOW_MS).toISOString()
  const { data: recentEvents } = await supabase
    .from('anomaly_events')
    .select('event_type')
    .eq('profile_id', profileId)
    .eq('acknowledged', false)
    .gte('created_at', dedupSince)
  const recentEventTypes = new Set(
    (recentEvents ?? []).map((e: { event_type: string }) => e.event_type)
  )

  const anomalies = runDetectors(profileId, baseline, currentRows, windowStart, windowEnd, recentEventTypes)
  if (anomalies.length === 0) return { detected: 0 }

  const { error } = await supabase.from('anomaly_events').insert(
    anomalies.map(a => ({
      profile_id:            a.profileId,
      agent_id:              a.agentId,
      event_type:            a.eventType,
      severity:              a.severity,
      current_value:         a.currentValue,
      baseline_value:        a.baselineValue,
      multiplier:            a.multiplier,
      detail:                a.detail,
      window_start:          a.windowStart,
      window_end:            a.windowEnd,
      affected_server_urls:  a.affectedServerUrls,
    }))
  )
  if (error) console.error('[anomaly] events insert:', error.message)

  return { detected: anomalies.length }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function round2(n: number): number { return Math.round(n * 100) / 100 }
function round3(n: number): number { return Math.round(n * 1000) / 1000 }
function pct(n: number): string    { return (n * 100).toFixed(1) }
