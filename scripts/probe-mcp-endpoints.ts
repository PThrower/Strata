// Live-probe runner for hosted MCP endpoints (Phase 3 of runtime scoring).
// Safe to interrupt and re-run — each row is checkpointed via last_probe_at.
//
// Usage:
//   npx tsx --env-file=.env.local scripts/probe-mcp-endpoints.ts
//
// Optional env:
//   PROBE_LIMIT=50           — process at most N rows this run (default: all)
//   PROBE_STALE_DAYS=7       — re-probe rows older than N days (default: 7)

import Anthropic from '@anthropic-ai/sdk'
import { getServiceClient } from './refresh/writer'
import { scanToolDescriptions } from './refresh/runtime-tool-injection'
import { computeRuntimeScore, type RuntimeSignals } from './refresh/runtime-score'
import { probeMcpEndpoint, type CapabilityFlag } from '../lib/mcp-probe'
import { scoreTools, countDangerousTools, toToolScoresPayload } from './refresh/runtime-tool-score'

const BOLD   = '\x1b[1m'
const DIM    = '\x1b[2m'
const GREEN  = '\x1b[38;2;0;196;114m'
const YELLOW = '\x1b[38;2;245;158;11m'
const RED    = '\x1b[38;2;239;68;68m'
const RESET  = '\x1b[0m'

const STALE_DAYS = parseInt(process.env.PROBE_STALE_DAYS ?? '7', 10)
const LIMIT      = process.env.PROBE_LIMIT ? parseInt(process.env.PROBE_LIMIT, 10) : null

interface McpRow {
  id:                   string
  hosted_endpoint:      string
  tool_count:           number | null
  tool_names:           string[] | null
  capability_flags:     string[] | null
  tool_injection_max:   number | null
  injection_risk_score: number | null
}

async function main() {
  const supabase  = getServiceClient()
  const anthropic = process.env.ANTHROPIC_API_KEY
    ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    : null

  if (!anthropic) {
    console.warn(`${YELLOW}⚠ ANTHROPIC_API_KEY not set — tool-injection scan limited to Layer 1 only${RESET}`)
  }

  const staleCutoff = new Date(Date.now() - STALE_DAYS * 86_400_000).toISOString()

  let query = supabase
    .from('mcp_servers')
    .select('id, hosted_endpoint, tool_count, tool_names, capability_flags, tool_injection_max, injection_risk_score')
    .not('hosted_endpoint', 'is', null)
    .or(`last_probe_at.is.null,last_probe_at.lt.${staleCutoff}`)
    .order('id')
    .limit(100_000)

  if (LIMIT) query = query.limit(LIMIT)

  const { data: rows, error } = await query
  if (error) throw new Error(`Failed to fetch candidates: ${error.message}`)

  const total = (rows ?? []).length
  console.log(`\n${BOLD}Live-probing ${total} MCP endpoints${RESET}  ${DIM}(stale_days=${STALE_DAYS}${LIMIT ? `, limit=${LIMIT}` : ''})${RESET}\n`)

  const counts = { ok: 0, auth: 0, timeout: 0, opted_out: 0, error: 0, quarantined: 0 }

  for (let i = 0; i < total; i++) {
    const row    = (rows as McpRow[])[i]
    const prefix = `[${String(i + 1).padStart(String(total).length)}/${total}]`

    const staticBaseline = {
      toolNames:        row.tool_names ?? [],
      capabilityFlags:  (row.capability_flags ?? []) as CapabilityFlag[],
    }

    // ── Probe ──────────────────────────────────────────────────────────────
    let probe
    try {
      probe = await probeMcpEndpoint(row.hosted_endpoint, { staticBaseline })
    } catch (err) {
      console.error(`${RED}${prefix} fatal during probe: ${String(err).slice(0, 100)}${RESET}`)
      counts.error++
      continue
    }

    if (probe.status === 'opted_out') {
      counts.opted_out++
      console.log(`${DIM}${prefix} opted_out  ${row.hosted_endpoint}${RESET}`)
      continue
    }

    // ── Injection scan on observed tool descriptions ────────────────────────
    const injection = await scanToolDescriptions(probe.toolDescriptions, anthropic)

    // Merge: static ∪ probe capability flags
    const mergedFlags = Array.from(
      new Set([...(row.capability_flags ?? []), ...probe.capabilityFlags])
    ) as CapabilityFlag[]

    const newInjectionMax = Math.max(injection.maxScore, row.tool_injection_max ?? 0)

    // ── Per-tool scoring from live probe data (when tools were observed) ───
    // Only compute when probe succeeded and returned tool descriptions; otherwise
    // preserve whatever tool_scores static analysis already stored.
    const probeToolScores = probe.status === 'ok' && probe.toolDescriptions.length > 0
      ? scoreTools(probe.toolDescriptions)
      : null
    const probeDangerousCount = probeToolScores ? countDangerousTools(probeToolScores) : null

    // ── Re-score with live probe signals ──────────────────────────────────
    const signals: RuntimeSignals = {
      toolCount:            probe.toolCount ?? row.tool_count,
      toolNames:            probe.toolNames.length > 0 ? probe.toolNames : (row.tool_names ?? []),
      capabilityFlags:      mergedFlags,
      toolInjectionMax:     newInjectionMax > 0 ? newInjectionMax : null,
      hasHostedEndpoint:    true,
      dangerousToolCount:   probeDangerousCount,
      probeStatus:          probe.status,
      probeLatencyMs:       probe.latencyMs,
      probeDriftFromStatic: probe.driftFromStatic,
      schemaErrors:         probe.schemaErrors,
    }
    const { score, components } = computeRuntimeScore(signals)

    // ── Insert probe row ──────────────────────────────────────────────────
    const { error: insertErr } = await supabase.from('mcp_runtime_probes').insert({
      server_id:          row.id,
      endpoint:           probe.endpoint,
      status:             probe.status,
      latency_ms:         probe.latencyMs,
      tool_count:         probe.toolCount,
      tool_names:         probe.toolNames.length > 0 ? probe.toolNames : null,
      capability_flags:   probe.capabilityFlags.length > 0 ? probe.capabilityFlags : null,
      tool_injection_max: injection.maxScore > 0 ? injection.maxScore : null,
      schema_errors:      probe.schemaErrors,
      drift_from_static:  probe.driftFromStatic,
      raw_listing:        probe.rawListing,
    })
    if (insertErr) console.error(`  ${RED}probe insert failed: ${insertErr.message}${RESET}`)

    // ── Update mcp_servers ────────────────────────────────────────────────
    const updatePayload: Record<string, unknown> = {
      runtime_score:        score,
      runtime_components:   components,
      runtime_status:       'probed',
      runtime_updated_at:   probe.probedAt,
      last_probe_at:        probe.probedAt,
      last_probe_status:    probe.status,
      last_probe_latency_ms: probe.latencyMs,
      last_probe_drift:     probe.driftFromStatic,
    }

    // Propagate newly-discovered capability flags
    if (mergedFlags.length > (row.capability_flags ?? []).length) {
      updatePayload.capability_flags = mergedFlags
    }

    // Store per-tool scores from live probe (only when probe returned tool data)
    if (probeToolScores) {
      updatePayload.tool_scores = toToolScoresPayload(probeToolScores)
    }

    // Quarantine on injection (same safety semantics as runtime backfill)
    if (injection.injectionDetected) {
      updatePayload.is_quarantined      = true
      updatePayload.injection_risk_score = Math.max(injection.maxScore, row.injection_risk_score ?? 0)
      updatePayload.injection_scanned_at = probe.probedAt
      counts.quarantined++
    }

    const { error: upErr } = await supabase
      .from('mcp_servers')
      .update(updatePayload)
      .eq('id', row.id)
    if (upErr) {
      console.error(`  ${RED}update failed: ${upErr.message}${RESET}`)
      counts.error++
      continue
    }

    // ── Progress line ─────────────────────────────────────────────────────
    const sc = score >= 60 ? GREEN : score >= 40 ? YELLOW : RED
    const statusColor = probe.status === 'ok' ? GREEN : probe.status === 'error_auth_required' ? YELLOW : RED

    if      (probe.status === 'ok')                   counts.ok++
    else if (probe.status === 'error_auth_required')  counts.auth++
    else if (probe.status === 'timeout')              counts.timeout++
    else                                               counts.error++

    const driftMark = probe.driftFromStatic === true  ? ` ${YELLOW}drift${RESET}` : ''
    const injMark   = injection.injectionDetected
      ? ` ${RED}*INJ ${injection.maxScore}*${RESET}`
      : injection.maxScore >= 3 ? ` ${YELLOW}inj=${injection.maxScore}${RESET}` : ''
    const latStr    = probe.latencyMs !== null ? `${probe.latencyMs}ms` : '--'
    const tools     = probe.toolCount !== null ? `tools=${probe.toolCount}` : 'tools=?'

    console.log(
      `${DIM}${prefix}${RESET} ${sc}${String(score).padStart(3)}${RESET}  ` +
      `${statusColor}${probe.status.padEnd(22)}${RESET} ` +
      `${tools}  lat=${latStr}${driftMark}${injMark}  ${row.hosted_endpoint}`
    )
  }

  console.log(`\n${BOLD}Done.${RESET}`)
  console.log(`  ${GREEN}ok${RESET}            ${counts.ok}`)
  console.log(`  ${YELLOW}auth_required${RESET} ${counts.auth}`)
  console.log(`  ${YELLOW}timeout${RESET}       ${counts.timeout}`)
  console.log(`  ${DIM}opted_out${RESET}     ${counts.opted_out}`)
  console.log(`  ${RED}error${RESET}         ${counts.error}`)
  console.log(`  ${RED}quarantined${RESET}   ${counts.quarantined}`)
}

main().catch(err => {
  console.error(`${RED}Fatal: ${err}${RESET}`)
  process.exit(1)
})
