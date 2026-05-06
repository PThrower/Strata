// Pure scoring function for runtime behavioral trust.
// Same shape as security-score.ts: deterministic, side-effect free, easy to unit-test.
//
// Score components (all signed, applied to base = 50, clamped to [0,100]):
//   tools     : -5 to +8   shape & breadth of declared tool set
//   caps      : -71 to 0   capability-flag penalties (sum across flags)
//   injection : -40 to 0   tool-description injection severity
//   probe     : -8 to +20  live-probe outcome (Phase 3, null in Phase 1)
//   hosted    :  0 or +4   has discoverable live endpoint

import type { CapabilityFlag } from './runtime-static'

export interface RuntimeSignals {
  toolCount: number | null
  toolNames: string[]
  capabilityFlags: CapabilityFlag[]
  toolInjectionMax: number | null
  hasHostedEndpoint: boolean
  // Per-tool breakdown (Phase 1 Item 2) — informational only, does not affect score formula.
  dangerousToolCount: number | null   // count of tools with risk >= medium
  // Probe (Phase 3) — null in Phase 1
  probeStatus: 'ok' | 'timeout' | 'opted_out' | 'error_transport' | 'error_protocol' | 'error_auth_required' | 'error_invalid_url' | null
  probeLatencyMs: number | null
  probeDriftFromStatic: boolean | null
  schemaErrors: number | null
}

export interface RuntimeScoreResult {
  score: number
  components: {
    base: number
    tools: number
    caps: number
    injection: number
    probe: number
    hosted: number
    dangerousToolCount: number | null  // informational — not part of score formula
  }
}

const BASE = 50

function toolPoints(count: number | null, names: string[]): number {
  if (count === null) return -5            // unparsed source — uncertain, ranks below scored
  if (count === 0)    return  0
  if (count > 30)     return -5            // sprawl — too many tools is a smell
  // Diversity bonus: distinct verb prefixes (read_*, list_*, get_*) suggest narrower scope.
  const verbs = new Set(names.map(n => n.split(/[_.]/)[0].toLowerCase()).filter(Boolean))
  if (verbs.size <= 2) return 8
  if (verbs.size <= 5) return 5
  return 2
}

function capabilityPenalty(flags: CapabilityFlag[]): number {
  let p = 0
  if (flags.includes('shell_exec'))    p -= 18
  if (flags.includes('dynamic_eval'))  p -= 18
  if (flags.includes('arbitrary_sql')) p -= 12
  if (flags.includes('process_spawn')) p -= 10
  if (flags.includes('fs_write'))      p -= 6
  if (flags.includes('secret_read'))   p -= 6
  if (flags.includes('net_egress'))    p -= 3   // ~every useful server has this
  return p
}

function injectionPenalty(toolInjectionMax: number | null): number {
  if (toolInjectionMax === null) return 0
  if (toolInjectionMax >= 6)     return -40    // (also quarantines via is_quarantined=true)
  if (toolInjectionMax >= 3)     return -15
  return 0
}

function probeBonus(s: RuntimeSignals): number {
  if (s.probeStatus === 'error_auth_required') return 2              // endpoint exists and is gating — better than silent transport failure
  if (s.probeStatus !== 'ok') return 0
  let b = 10                                                          // it actually responded
  if (s.probeLatencyMs !== null && s.probeLatencyMs < 1000) b += 3
  if (s.schemaErrors === 0)                                  b += 4
  if (s.probeDriftFromStatic === false)                      b += 3   // static analysis matched reality
  if (s.probeDriftFromStatic === true)                       b -= 8   // probe surfaced tools static missed
  return b
}

function hostedBonus(hasHosted: boolean): number {
  return hasHosted ? 4 : 0
}

export function computeRuntimeScore(s: RuntimeSignals): RuntimeScoreResult {
  const tools     = toolPoints(s.toolCount, s.toolNames)
  const caps      = capabilityPenalty(s.capabilityFlags)
  const injection = injectionPenalty(s.toolInjectionMax)
  const probe     = probeBonus(s)
  const hosted    = hostedBonus(s.hasHostedEndpoint)

  const raw = BASE + tools + caps + injection + probe + hosted
  const score = Math.max(0, Math.min(100, Math.round(raw)))

  return {
    score,
    components: { base: BASE, tools, caps, injection, probe, hosted, dangerousToolCount: s.dangerousToolCount ?? null },
  }
}
