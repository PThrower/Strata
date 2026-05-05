import { createHmac, randomUUID } from 'crypto'
import { createServiceRoleClient } from './supabase-server'
import type { RiskLevel } from './risk'

// HMAC-SHA256 key for signing ledger rows. If unset, rows insert with
// signature = null (warn-only). Generate with: openssl rand -hex 32
const LEDGER_SIGNING_KEY = process.env.LEDGER_SIGNING_KEY ?? ''
if (!LEDGER_SIGNING_KEY) {
  console.warn('[ledger] LEDGER_SIGNING_KEY not set — entries will be unsigned')
}

const SECRET_KEY_PATTERN = /key|sen|password|auth/i

function sanitizeParams(
  p: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  if (!p) return null
  return Object.fromEntries(
    Object.entries(p).filter(([k]) => !SECRET_KEY_PATTERN.test(k)),
  )
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
    const id = randomUUID()
    const created_at = new Date().toISOString()
    const signature = LEDGER_SIGNING_KEY
      ? createHmac('sha256', LEDGER_SIGNING_KEY)
          .update(`${id}|${entry.profileId ?? ''}|${entry.toolCalled}|${created_at}`)
          .digest('hex')
      : null

    const sb = createServiceRoleClient()
    const { error } = await sb.from('agent_activity_ledger').insert({
      id,
      created_at,
      signature,
      profile_id: entry.profileId,
      agent_id: entry.agentId ?? null,
      tool_called: entry.toolCalled,
      server_url: entry.serverUrl ?? null,
      parameters: sanitizeParams(entry.parameters),
      response_summary: entry.responseSummary ?? null,
      risk_level: entry.riskLevel ?? null,
      capability_flags: entry.capabilityFlags ?? null,
      duration_ms: entry.durationMs ?? null,
    })
    if (error) console.error('[ledger] insert failed:', error.message)
  } catch (err) {
    console.error('[ledger] write threw:', err)
  }
}
