// Per-tool risk scoring for MCP server tools.
// Pure function — no DB access, no LLM calls.
//
// Derives two signals from each tool's description text:
//   1. capability flags  — FLAG_PATTERNS run against the description (description-level,
//                          weaker than source-level; coexists with server-level flags)
//   2. injection score   — Layer-1 regex (scanForInjection) per tool
//
// The server-level capability_flags (from full source) are authoritative for scoring.
// These per-tool flags answer "which tool?" not "does the server have the flag?".

import { extractCapabilityFlags, type CapabilityFlag, type ExtractedTool } from './runtime-static'
import { scanForInjection } from '../../lib/injection-scanner'

export type ToolRisk = 'low' | 'medium' | 'high' | 'critical'

export interface ToolScore {
  name:            string
  cap_flags:       CapabilityFlag[]
  injection_score: number          // 0-10, Layer-1 only
  risk:            ToolRisk
}

// Risk hierarchy mirrors lib/risk.ts — conservative, stops at first match.
const HIGH_CAP_FLAGS   = new Set<CapabilityFlag>(['shell_exec', 'dynamic_eval'])
const MEDIUM_CAP_FLAGS = new Set<CapabilityFlag>(['fs_write', 'arbitrary_sql', 'secret_read', 'process_spawn', 'net_egress'])

function deriveToolRisk(capFlags: CapabilityFlag[], injectionScore: number): ToolRisk {
  if (injectionScore >= 6)                         return 'critical'
  if (capFlags.some(f => HIGH_CAP_FLAGS.has(f)))   return 'high'
  if (capFlags.some(f => MEDIUM_CAP_FLAGS.has(f))) return 'medium'
  return 'low'
}

// Score each tool. O(N * patterns) — fast enough for ≤100 tools per server.
export function scoreTools(tools: ExtractedTool[]): ToolScore[] {
  return tools.map(tool => {
    const capFlags      = extractCapabilityFlags(tool.description)
    const injectionScore = scanForInjection(tool.description).score
    const risk           = deriveToolRisk(capFlags, injectionScore)
    return { name: tool.name, cap_flags: capFlags, injection_score: injectionScore, risk }
  })
}

// Count tools with risk >= medium. Used for the dangerousToolCount RuntimeSignal.
export function countDangerousTools(scores: ToolScore[]): number {
  return scores.filter(s => s.risk === 'medium' || s.risk === 'high' || s.risk === 'critical').length
}

// Serialise ToolScore[] to the jsonb storage format: { toolName: { cap_flags, injection_score, risk } }.
// Returns null when scores is empty (no tools extracted).
export function toToolScoresPayload(scores: ToolScore[]): Record<string, Omit<ToolScore, 'name'>> | null {
  if (scores.length === 0) return null
  return Object.fromEntries(
    scores.map(({ name, cap_flags, injection_score, risk }) => [
      name,
      { cap_flags, injection_score, risk },
    ])
  )
}
