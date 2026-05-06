import { createHmac, randomUUID } from 'crypto'
import { createServiceRoleClient } from './supabase-server'
import type { RiskLevel } from './risk'

// HMAC-SHA256 key for signing ledger rows. If unset, rows insert with
// signature = null (warn-only). Generate with: openssl rand -hex 32
const LEDGER_SIGNING_KEY = process.env.LEDGER_SIGNING_KEY ?? ''
if (!LEDGER_SIGNING_KEY) {
  console.warn('[ledger] LEDGER_SIGNING_KEY not set — entries will be unsigned')
}

// Tightened secret-key pattern: whole-word matches only, avoids over-redacting
// innocent fields like "category" or "agency".
const SECRET_KEY_PATTERN = /\b(api[_-]?key|secret|password|token|authorization|bearer)\b/i

function sanitizeParams(
  p: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  if (!p) return null
  return Object.fromEntries(
    Object.entries(p).filter(([k]) => !SECRET_KEY_PATTERN.test(k)),
  )
}

// ── Stable canonical JSON (deterministic across JS engines) ──────────────────
// Used as the HMAC input so the signature covers all persisted columns.
// Sorts object keys alphabetically and recurses into arrays/objects.
function stableStringify(v: unknown): string {
  if (v === null || v === undefined) return 'null'
  if (typeof v !== 'object') return JSON.stringify(v)
  if (Array.isArray(v)) return '[' + (v as unknown[]).map(stableStringify).join(',') + ']'
  const keys = Object.keys(v as object).sort()
  return '{' + keys.map(k => JSON.stringify(k) + ':' + stableStringify((v as Record<string, unknown>)[k])).join(',') + '}'
}

function canonicalizeLedgerRow(
  id: string,
  created_at: string,
  entry: LedgerEntry,
  sanitizedParams: Record<string, unknown> | null,
): string {
  return stableStringify({
    id,
    created_at,
    profile_id:       entry.profileId ?? null,
    agent_id:         entry.agentId ?? null,
    tool_called:      entry.toolCalled,
    server_url:       entry.serverUrl ?? null,
    parameters:       sanitizedParams,
    response_summary: entry.responseSummary ?? null,
    risk_level:       entry.riskLevel ?? null,
    capability_flags: entry.capabilityFlags ?? null,
    duration_ms:      entry.durationMs ?? null,
  })
}

export interface LedgerEntry {
  profileId: string | null
  agentId?: string | null
  toolCalled: string
  serverUrl?: string | null
  parameters?: Record<string, unknown> | null
  responseSummary?: Record<string, unknown> | null
  riskLevel?: RiskLevel | null
  capabilityFlags?: string[] | null
  durationMs?: number | null
}

export async function writeLedgerEntry(entry: LedgerEntry): Promise<void> {
  try {
    const id          = randomUUID()
    const created_at  = new Date().toISOString()
    // Sanitize once — used for both the HMAC and the DB insert.
    const sanitizedParams = sanitizeParams(entry.parameters)

    const signature = LEDGER_SIGNING_KEY
      ? createHmac('sha256', LEDGER_SIGNING_KEY)
          .update(canonicalizeLedgerRow(id, created_at, entry, sanitizedParams))
          .digest('hex')
      : null

    const sb = createServiceRoleClient()
    const { error } = await sb.from('agent_activity_ledger').insert({
      id,
      created_at,
      signature,
      profile_id:       entry.profileId,
      agent_id:         entry.agentId ?? null,
      tool_called:      entry.toolCalled,
      server_url:       entry.serverUrl ?? null,
      parameters:       sanitizedParams,
      response_summary: entry.responseSummary ?? null,
      risk_level:       entry.riskLevel ?? null,
      capability_flags: entry.capabilityFlags ?? null,
      duration_ms:      entry.durationMs ?? null,
    })
    if (error) console.error('[ledger] insert failed:', error.message)
  } catch (err) {
    console.error('[ledger] write threw:', err)
  }
}

// ── verifyLedgerRow ───────────────────────────────────────────────────────────
// Takes a raw DB row and returns true if the stored HMAC matches the canonical
// JSON of all persisted fields.
//
// IMPORTANT: rows created before 2026-05-07 were signed with a narrower input
// (id|profile_id|tool_called|created_at only). Those rows will return false —
// they are "unverifiable" (pre-fix), not "tampered". Use the created_at timestamp
// to distinguish pre-fix rows in compliance reports.
export function verifyLedgerRow(row: Record<string, unknown>): boolean {
  if (!LEDGER_SIGNING_KEY) return false
  const stored = typeof row.signature === 'string' ? row.signature : null
  if (!stored) return false

  const canonical = stableStringify({
    id:               row.id,
    created_at:       row.created_at,
    profile_id:       row.profile_id ?? null,
    agent_id:         row.agent_id ?? null,
    tool_called:      row.tool_called,
    server_url:       row.server_url ?? null,
    parameters:       row.parameters ?? null,
    response_summary: row.response_summary ?? null,
    risk_level:       row.risk_level ?? null,
    capability_flags: row.capability_flags ?? null,
    duration_ms:      row.duration_ms ?? null,
  })

  const expected = createHmac('sha256', LEDGER_SIGNING_KEY).update(canonical).digest('hex')
  return expected === stored
}
