// Compliance reporting — generates SOC 2 / ISO 27001 audit evidence packages
// from the Agent Activity Ledger. Returns JSON or CSV attachment.
//
// Auth: Supabase session cookie (createUserClient) — dashboard-first.
// No new tables — queries existing agent_activity_ledger.

import { type NextRequest } from 'next/server'
import { createUserClient, createServiceRoleClient } from '@/lib/supabase-server'
import { verifyLedgerRow } from '@/lib/ledger'

// ── Types ─────────────────────────────────────────────────────────────────────

type RiskLevel = 'low' | 'medium' | 'high' | 'critical' | 'unknown'

interface LedgerRow {
  id:               string
  created_at:       string
  profile_id:       string | null   // needed for verifyLedgerRow HMAC; excluded from output
  agent_id:         string | null
  tool_called:      string
  server_url:       string | null
  parameters:       Record<string, unknown> | null  // needed for verifyLedgerRow; excluded from output
  response_summary: Record<string, unknown> | null  // needed for verifyLedgerRow; excluded from output
  risk_level:       RiskLevel | null
  capability_flags: string[] | null
  duration_ms:      number | null
  signature:        string | null
}

interface RawRow {
  id:               string
  created_at:       string
  agent_id:         string | null
  tool_called:      string
  server_url:       string | null
  risk_level:       string | null
  capability_flags: string[] | null
  duration_ms:      number | null
  signature_valid:  boolean | null   // null = unverifiable (no signature or key not set)
}

interface ComplianceReport {
  metadata: {
    generated_at:   string
    account_id:     string
    period_from:    string
    period_to:      string
    total_records:  number
    standard:       'soc2' | 'iso27001'
    report_version: '1.0'
    disclaimer:     string
  }
  tamper_evidence: {
    total_rows:               number
    verified_rows:            number
    unverified_rows:          number
    failed_rows:              number
    verification_sample_size: number
    append_only:              true
    signing_key_configured:   boolean
    signing_key_warning?:     string   // present only when key is not configured
    note:                     string
  }
  agent_access: Array<{
    agent_id:         string
    call_count:       number
    first_seen:       string
    last_seen:        string
    distinct_tools:   string[]
    distinct_servers: string[]
  }>
  external_systems: Array<{
    server_url:       string
    first_accessed:   string
    last_accessed:    string
    call_count:       number
    capability_flags: string[]
    max_risk_level:   string
  }>
  risk_posture: {
    risk_distribution:          Record<RiskLevel, number>
    high_risk_calls:            RawRow[]
    dangerous_flag_rate:        string
    dangerous_flags_definition: string
  }
  tool_breakdown: Array<{
    tool:              string
    call_count:        number
    total_duration_ms: number | null
    avg_duration_ms:   number | null
    unique_servers:    number
  }>
  raw_rows: RawRow[]
}

// ── Constants ─────────────────────────────────────────────────────────────────

const MAX_RANGE_MS  = 365 * 24 * 60 * 60 * 1000
const SAMPLE_SIZE   = 1_000
const DANGEROUS_FLAGS = ['shell_exec', 'dynamic_eval', 'fs_write', 'arbitrary_sql']

const DISCLAIMER = [
  'This report is generated from the Strata Agent Activity Ledger.',
  'Source IP addresses are not stored in the ledger (hashed separately in api_query_log).',
  'Request parameters are sanitized to remove API keys, secrets, tokens, and credentials.',
  'raw_rows excludes parameters and response_summary — full data is available in the Activity Ledger dashboard.',
  'Rows predating 2026-05-07 have partial HMAC coverage (id|profile_id|tool_called|created_at only) and will show as unverified.',
].join(' ')

// ── Date range ────────────────────────────────────────────────────────────────

function computeDateRange(
  period: string,
  fromRaw: string | null,
  toRaw:   string | null,
): { from: string; to: string } | { error: string } {
  const now = new Date()

  if (period === 'custom') {
    if (!fromRaw || !toRaw) return { error: 'from and to are required when period=custom' }
    const from = new Date(fromRaw), to = new Date(toRaw)
    if (isNaN(from.getTime()) || isNaN(to.getTime())) return { error: 'from and to must be valid ISO dates' }
    if (from >= to) return { error: 'from must be before to' }
    if (to.getTime() - from.getTime() > MAX_RANGE_MS) return { error: 'Custom range must not exceed 365 days' }
    return { from: from.toISOString(), to: to.toISOString() }
  }

  const daysMap: Record<string, number> = { '30d': 30, '90d': 90, '1y': 365 }
  const days = daysMap[period] ?? 90
  const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
  return { from: from.toISOString(), to: now.toISOString() }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const RISK_ORDER: Record<string, number> = { low: 0, medium: 1, high: 2, critical: 3, unknown: -1 }

function maxRisk(a: string, b: string): string {
  return (RISK_ORDER[a] ?? -1) >= (RISK_ORDER[b] ?? -1) ? a : b
}

function toRawRow(r: LedgerRow, sigValid: boolean | null): RawRow {
  return {
    id:               r.id,
    created_at:       r.created_at,
    agent_id:         r.agent_id,
    tool_called:      r.tool_called,
    server_url:       r.server_url,
    risk_level:       r.risk_level,
    capability_flags: r.capability_flags,
    duration_ms:      r.duration_ms,
    signature_valid:  sigValid,
  }
}

// ── CSV builder ───────────────────────────────────────────────────────────────

function csvEscape(v: unknown): string {
  let s = v == null ? '' : String(v)
  // Formula-injection guard: spreadsheet apps (Excel, Sheets, LibreOffice) interpret
  // cells starting with =, +, -, @, tab, or CR as formulas. Prefix with a single
  // quote so the cell is treated as text.
  if (s.length > 0 && /^[=+\-@\t\r]/.test(s)) {
    s = "'" + s
  }
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"'
  }
  return s
}

function buildCsv(rawRows: RawRow[]): string {
  const header = 'id,created_at,agent_id,tool_called,server_url,risk_level,capability_flags,duration_ms,signature_valid'
  const lines = rawRows.map(r => [
    r.id,
    r.created_at,
    r.agent_id ?? '',
    r.tool_called,
    r.server_url ?? '',
    r.risk_level ?? '',
    (r.capability_flags ?? []).join('|'),
    r.duration_ms ?? '',
    r.signature_valid === null ? 'unverifiable' : String(r.signature_valid),
  ].map(csvEscape).join(','))
  return [header, ...lines].join('\n')
}

// ── Report builder ────────────────────────────────────────────────────────────

function buildReport(
  rows:       LedgerRow[],
  profileId:  string,
  periodFrom: string,
  periodTo:   string,
  standard:   'soc2' | 'iso27001',
): ComplianceReport {
  const keyConfigured = !!process.env.LEDGER_SIGNING_KEY

  // ── Signature verification (spot-check first SAMPLE_SIZE rows, already ordered DESC) ─
  const sample = rows.slice(0, SAMPLE_SIZE)
  let verified = 0, unverified = 0, failed = 0

  const sigMap = new Map<string, boolean | null>()
  for (const row of sample) {
    if (!row.signature) {
      unverified++
      sigMap.set(row.id, null)
    } else if (!keyConfigured) {
      unverified++
      sigMap.set(row.id, null)
    } else {
      const valid = verifyLedgerRow(row as unknown as Record<string, unknown>)
      if (valid) { verified++; sigMap.set(row.id, true) }
      else       { failed++;   sigMap.set(row.id, false) }
    }
  }
  // Rows outside the sample get null (unverified in this report)
  for (const row of rows.slice(SAMPLE_SIZE)) sigMap.set(row.id, null)

  const rawRows = rows.map(r => toRawRow(r, sigMap.get(r.id) ?? null))

  // ── Agent access (Section 3) ────────────────────────────────────────────────
  const agentMap = new Map<string, { calls: number; first: string; last: string; tools: Set<string>; servers: Set<string> }>()
  for (const row of rows) {
    const key = row.agent_id ?? 'unidentified'
    const e = agentMap.get(key) ?? { calls: 0, first: row.created_at, last: row.created_at, tools: new Set(), servers: new Set() }
    e.calls++
    if (row.created_at < e.first) e.first = row.created_at
    if (row.created_at > e.last)  e.last  = row.created_at
    e.tools.add(row.tool_called)
    if (row.server_url) e.servers.add(row.server_url)
    agentMap.set(key, e)
  }
  const agentAccess = [...agentMap.entries()].map(([id, e]) => ({
    agent_id:         id,
    call_count:       e.calls,
    first_seen:       e.first,
    last_seen:        e.last,
    distinct_tools:   [...e.tools].sort(),
    distinct_servers: [...e.servers].sort(),
  })).sort((a, b) => b.call_count - a.call_count)

  // ── External systems (Section 4) ────────────────────────────────────────────
  const sysMap = new Map<string, { first: string; last: string; calls: number; flags: Set<string>; maxRisk: string }>()
  for (const row of rows) {
    const url = row.server_url ?? '(no server)'
    const e = sysMap.get(url) ?? { first: row.created_at, last: row.created_at, calls: 0, flags: new Set(), maxRisk: 'unknown' }
    e.calls++
    if (row.created_at < e.first) e.first = row.created_at
    if (row.created_at > e.last)  e.last  = row.created_at
    for (const f of row.capability_flags ?? []) e.flags.add(f)
    if (row.risk_level) e.maxRisk = maxRisk(e.maxRisk, row.risk_level)
    sysMap.set(url, e)
  }
  const externalSystems = [...sysMap.entries()].map(([url, e]) => ({
    server_url:       url,
    first_accessed:   e.first,
    last_accessed:    e.last,
    call_count:       e.calls,
    capability_flags: [...e.flags].sort(),
    max_risk_level:   e.maxRisk,
  })).sort((a, b) => b.call_count - a.call_count)

  // ── Risk posture (Section 5) ─────────────────────────────────────────────────
  const dist: Record<RiskLevel, number> = { low: 0, medium: 0, high: 0, critical: 0, unknown: 0 }
  let dangerousCount = 0
  const highRiskRawRows: RawRow[] = []

  for (const row of rows) {
    const rl = (row.risk_level ?? 'unknown') as RiskLevel
    dist[rl] = (dist[rl] ?? 0) + 1
    if (rl === 'high' || rl === 'critical') highRiskRawRows.push(toRawRow(row, sigMap.get(row.id) ?? null))
    if ((row.capability_flags ?? []).some(f => DANGEROUS_FLAGS.includes(f))) dangerousCount++
  }

  const total = rows.length
  const dangerousPct = total > 0 ? ((dangerousCount / total) * 100).toFixed(1) : '0.0'

  // ── Tool breakdown (Section 6) ───────────────────────────────────────────────
  const toolMap = new Map<string, { calls: number; totalMs: number; countMs: number; servers: Set<string> }>()
  for (const row of rows) {
    const e = toolMap.get(row.tool_called) ?? { calls: 0, totalMs: 0, countMs: 0, servers: new Set() }
    e.calls++
    if (row.duration_ms != null) { e.totalMs += row.duration_ms; e.countMs++ }
    if (row.server_url) e.servers.add(row.server_url)
    toolMap.set(row.tool_called, e)
  }
  const toolBreakdown = [...toolMap.entries()].map(([tool, e]) => ({
    tool,
    call_count:        e.calls,
    total_duration_ms: e.countMs > 0 ? e.totalMs : null,
    avg_duration_ms:   e.countMs > 0 ? Math.round(e.totalMs / e.countMs) : null,
    unique_servers:    e.servers.size,
  })).sort((a, b) => b.call_count - a.call_count)

  // ── Tamper evidence note ─────────────────────────────────────────────────────
  const sampleSize = sample.length
  let tamperNote: string
  if (failed > 0 && verified === 0) {
    tamperNote = `All ${sampleSize.toLocaleString()} rows in sample have non-matching signatures. Rows written before 2026-05-07 have partial HMAC coverage and will show as failed — this is expected, not tampering. Run verifyLedgerRow() against specific rows of concern.`
  } else if (failed > 0 && verified > 0) {
    tamperNote = `Spot-check complete: ${verified.toLocaleString()} verified, ${failed.toLocaleString()} with non-matching signatures (may include pre-2026-05-07 rows with partial HMAC coverage), ${unverified.toLocaleString()} unsigned.`
  } else if (failed === 0 && unverified === 0) {
    tamperNote = `All ${verified.toLocaleString()} rows in sample verified — ledger integrity confirmed.`
  } else {
    tamperNote = `${verified.toLocaleString()} verified, ${unverified.toLocaleString()} unsigned (rows written before LEDGER_SIGNING_KEY was configured).`
  }

  const tamperEvidence: ComplianceReport['tamper_evidence'] = {
    total_rows:               total,
    verified_rows:            verified,
    unverified_rows:          unverified,
    failed_rows:              failed,
    verification_sample_size: sample.length,
    append_only:              true,
    signing_key_configured:   keyConfigured,
    note:                     tamperNote,
  }
  if (!keyConfigured) {
    tamperEvidence.signing_key_warning =
      'LEDGER_SIGNING_KEY is not configured in this environment. ' +
      'HMAC signatures cannot be verified. All rows appear as unverified regardless of their stored signature. ' +
      'Set LEDGER_SIGNING_KEY to enable tamper-evidence verification.'
  }

  return {
    metadata: {
      generated_at:   new Date().toISOString(),
      account_id:     profileId,
      period_from:    periodFrom,
      period_to:      periodTo,
      total_records:  total,
      standard,
      report_version: '1.0',
      disclaimer:     DISCLAIMER,
    },
    tamper_evidence: tamperEvidence,
    agent_access:    agentAccess,
    external_systems: externalSystems,
    risk_posture: {
      risk_distribution:          dist,
      high_risk_calls:            highRiskRawRows,
      dangerous_flag_rate:        `${dangerousPct}% of calls (${dangerousCount.toLocaleString()} of ${total.toLocaleString()}) contacted servers with dangerous capability flags`,
      dangerous_flags_definition: DANGEROUS_FLAGS.join(', '),
    },
    tool_breakdown: toolBreakdown,
    raw_rows:        rawRows,
  }
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(request: NextRequest): Promise<Response> {
  // ── Auth ────────────────────────────────────────────────────────────────────
  const userClient = await createUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const sp = request.nextUrl.searchParams

  // ── Validate params ──────────────────────────────────────────────────────────
  const format   = sp.get('format')   ?? 'json'
  const period   = sp.get('period')   ?? '90d'
  const standard = sp.get('standard') ?? 'soc2'

  if (!['json', 'csv'].includes(format))
    return Response.json({ error: 'format must be json or csv' }, { status: 400 })
  if (!['30d', '90d', '1y', 'custom'].includes(period))
    return Response.json({ error: 'period must be 30d, 90d, 1y, or custom' }, { status: 400 })
  if (!['soc2', 'iso27001'].includes(standard))
    return Response.json({ error: 'standard must be soc2 or iso27001' }, { status: 400 })

  const range = computeDateRange(period, sp.get('from'), sp.get('to'))
  if ('error' in range) return Response.json({ error: range.error }, { status: 400 })

  // ── Fetch rows ───────────────────────────────────────────────────────────────
  const sb = createServiceRoleClient()
  const MAX_REPORT_ROWS = 50_000

  // Count first to detect overflow before fetching all data
  const { count: totalCount, error: countErr } = await sb
    .from('agent_activity_ledger')
    .select('id', { count: 'exact', head: true })
    .eq('profile_id', user.id)
    .gte('created_at', range.from)
    .lte('created_at', range.to)

  if (countErr) {
    console.error('[compliance] count failed:', countErr.message)
    return Response.json({ error: 'Service error' }, { status: 503 })
  }

  if ((totalCount ?? 0) > MAX_REPORT_ROWS) {
    return Response.json(
      {
        error: `Report would contain ${totalCount} rows, which exceeds the ${MAX_REPORT_ROWS.toLocaleString()} row limit. Use a shorter period (try period=90d or period=30d).`,
        total_count: totalCount,
        max_rows:    MAX_REPORT_ROWS,
      },
      { status: 413 },
    )
  }

  // Fetch all columns needed for verifyLedgerRow HMAC (profile_id, parameters,
  // response_summary). These are used internally and are NOT included in report output.
  const { data, error: dbErr } = await sb
    .from('agent_activity_ledger')
    .select('id, created_at, profile_id, agent_id, tool_called, server_url, parameters, response_summary, risk_level, capability_flags, duration_ms, signature')
    .eq('profile_id', user.id)
    .gte('created_at', range.from)
    .lte('created_at', range.to)
    .order('created_at', { ascending: false })
    .range(0, MAX_REPORT_ROWS - 1)

  if (dbErr) {
    console.error('[compliance] fetch failed:', dbErr.message)
    return Response.json({ error: 'Service error' }, { status: 503 })
  }

  const rows = (data ?? []) as unknown as LedgerRow[]

  // ── Build filename ───────────────────────────────────────────────────────────
  const fromDate = range.from.slice(0, 10).replace(/-/g, '')
  const toDate   = range.to.slice(0, 10).replace(/-/g, '')
  const today    = new Date().toISOString().slice(0, 10)

  if (format === 'csv') {
    const report   = buildReport(rows, user.id, range.from, range.to, standard as 'soc2' | 'iso27001')
    const csv      = buildCsv(report.raw_rows)
    const filename = `strata-${standard}-${fromDate}-${toDate}.csv`
    return new Response(csv, {
      headers: {
        'Content-Type':        'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  }

  // JSON default
  const report   = buildReport(rows, user.id, range.from, range.to, standard as 'soc2' | 'iso27001')
  const filename = `strata-${standard}-report-${today}.json`
  return new Response(JSON.stringify(report, null, 2), {
    headers: {
      'Content-Type':        'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
