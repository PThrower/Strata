import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createUserClient, createServiceRoleClient } from '@/lib/supabase-server'
import { FREE_LIMIT, PRO_LIMIT } from '@/lib/api-auth'
import ApiKeyCard from './_components/api-key-card'
import { UsageBar } from './_components/UsageBar'
import { RiskBadge } from './_components/RiskBadge'

// ── Types ─────────────────────────────────────────────────────────────────────

type DashboardProfile = {
  id: string; api_key: string; tier: string
  calls_used: number; calls_reset_at: string | null; lifetime_pro: boolean
}

type LedgerRow = {
  id: string; tool_called: string; server_url: string | null
  risk_level: string | null; created_at: string
}

type ThreatRow = {
  id: string; event_type: string; severity: string
  server_url: string | null; server_name: string | null
  detail: string | null; created_at: string
}

type PolicyRow = {
  id: string; name: string; action: string
  match_capability_flags: string[] | null
  match_risk_level_gte: string | null
  match_tool_names: string[] | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60)  return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60)  return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24)  return `${h}h ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function safeHostname(url: string | null): string {
  if (!url) return '—'
  try { return new URL(url).hostname } catch { return url }
}

function policyCondition(p: PolicyRow): string {
  const parts: string[] = []
  if (p.match_capability_flags?.length) parts.push(p.match_capability_flags.slice(0, 2).join(', '))
  if (p.match_risk_level_gte) parts.push(`risk ≥ ${p.match_risk_level_gte}`)
  if (p.match_tool_names?.length) parts.push(`tool: ${p.match_tool_names[0]}`)
  return parts.join(' · ') || '(any)'
}

const THREAT_LABELS: Record<string, string> = {
  quarantine_added:      '⛔ Quarantined',
  quarantine_removed:    '✓ Unquarantined',
  capability_flag_added: '🚩 Flag added',
  score_critical_drop:   '📉 Score critical',
  score_significant_drop:'📉 Score drop',
  injection_detected:    '💉 Injection',
}

// ── Chip component ────────────────────────────────────────────────────────────

const CHIP_BASE: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '4px 12px', borderRadius: 6,
  fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 400,
  textDecoration: 'none', whiteSpace: 'nowrap', border: '1px solid',
  cursor: 'pointer',
}

const CHIP_ZINC: React.CSSProperties = {
  ...CHIP_BASE,
  background: 'var(--hair)',
  borderColor: 'var(--hair)',
  color: 'var(--ink-muted)',
}
const CHIP_EMERALD: React.CSSProperties = {
  ...CHIP_BASE,
  background: 'rgba(0,196,114,0.08)',
  borderColor: 'rgba(0,196,114,0.25)',
  color: '#00c472',
}
const CHIP_AMBER: React.CSSProperties = {
  ...CHIP_BASE,
  background: 'rgba(249,115,22,0.10)',
  borderColor: 'rgba(249,115,22,0.30)',
  color: '#f97316',
}
const CHIP_RED: React.CSSProperties = {
  ...CHIP_BASE,
  background: 'rgba(239,68,68,0.10)',
  borderColor: 'rgba(239,68,68,0.30)',
  color: '#ef4444',
}

const CARD: React.CSSProperties = { background: 'linear-gradient(135deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 35%, rgba(255,255,255,0.02) 70%, rgba(0,196,114,0.05) 100%)', backdropFilter: 'blur(28px) saturate(180%)', WebkitBackdropFilter: 'blur(28px) saturate(180%)', border: '1px solid rgba(255,255,255,0.10)', borderTopColor: 'rgba(255,255,255,0.28)', borderLeftColor: 'rgba(255,255,255,0.20)', borderRadius: '22px', boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.30), inset 1px 0 0 0 rgba(255,255,255,0.14), inset 0 -1px 0 0 rgba(0,0,0,0.30), inset 0 0 36px 0 rgba(0,196,114,0.04), 0 24px 60px -24px rgba(0,0,0,0.7), 0 4px 14px -4px rgba(0,0,0,0.4)' }

const COL_LABEL: React.CSSProperties = {
  fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 500,
  letterSpacing: '0.18em', textTransform: 'uppercase',
  color: 'var(--ink-faint)', marginBottom: 12,
}

const SEV_DOT: Record<string, string> = {
  critical: '#ef4444', high: '#f97316', medium: '#f59e0b', low: '#00c472',
}

const RISK_DOT: Record<string, string> = {
  critical: '#ef4444', high: '#f97316', medium: '#f59e0b', low: '#00c472', unknown: 'var(--ink-faint)',
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const userClient = await createUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) redirect('/login')

  const sb = createServiceRoleClient()
  const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString()

  // ── Round 1: independent queries ─────────────────────────────────────────

  const [
    { data: profileRow },
    { count: serverCount },
    { data: urlRows },
    { count: anomalyCount },
    { count: agentCount },
    { data: recentPolicies, count: policyCount },
    { data: recentLedger },
  ] = await Promise.all([
    sb.from('profiles')
      .select('id, api_key, tier, calls_used, calls_reset_at, lifetime_pro')
      .eq('id', user.id)
      .maybeSingle<DashboardProfile>(),
    sb.from('mcp_servers')
      .select('id', { count: 'exact', head: true })
      .eq('is_quarantined', false),
    sb.from('agent_activity_ledger')
      .select('server_url')
      .eq('profile_id', user.id)
      .not('server_url', 'is', null),
    sb.from('anomaly_events')
      .select('id', { count: 'exact', head: true })
      .eq('profile_id', user.id)
      .eq('acknowledged', false),
    sb.from('agent_identities')
      .select('id', { count: 'exact', head: true })
      .eq('profile_id', user.id)
      .is('revoked_at', null),
    sb.from('policies')
      .select('id, name, action, match_capability_flags, match_risk_level_gte, match_tool_names', { count: 'exact' })
      .eq('profile_id', user.id)
      .eq('enabled', true)
      .order('priority', { ascending: true })
      .limit(5),
    sb.from('agent_activity_ledger')
      .select('id, tool_called, server_url, risk_level, created_at')
      .eq('profile_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const profile = profileRow
  if (!profile) redirect('/login')

  const connectedUrls = [...new Set(
    (urlRows ?? []).map((r: { server_url: string }) => r.server_url).filter(Boolean)
  )] as string[]

  // ── Round 2: depends on connectedUrls ─────────────────────────────────────

  const [
    { data: recentThreats },
    { count: threatCount },
    { count: cbCount },
  ] = await Promise.all([
    connectedUrls.length > 0
      ? sb.from('threat_feed')
          .select('id, event_type, severity, server_url, server_name, detail, created_at')
          .in('server_url', connectedUrls)
          .in('severity', ['critical', 'high'])
          .gte('created_at', sevenDaysAgo)
          .order('created_at', { ascending: false })
          .limit(3)
      : Promise.resolve({ data: [], count: 0, error: null }),
    connectedUrls.length > 0
      ? sb.from('threat_feed')
          .select('id', { count: 'exact', head: true })
          .in('server_url', connectedUrls)
          .in('severity', ['critical', 'high'])
          .gte('created_at', sevenDaysAgo)
      : Promise.resolve({ data: null, count: 0, error: null }),
    connectedUrls.length > 0
      ? sb.from('mcp_servers')
          .select('id', { count: 'exact', head: true })
          .eq('circuit_broken', true)
          .in('url', connectedUrls)
      : Promise.resolve({ data: null, count: 0, error: null }),
  ])

  // ── Derived values ────────────────────────────────────────────────────────

  const limit     = profile.tier === 'pro' ? PRO_LIMIT : FREE_LIMIT
  const pct       = Math.min((profile.calls_used / limit) * 100, 100)
  const resetDate = profile.calls_reset_at
    ? new Date(profile.calls_reset_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : 'N/A'

  const threats  = (recentThreats ?? []) as ThreatRow[]
  const policies = (recentPolicies ?? []) as PolicyRow[]
  const ledger   = (recentLedger ?? []) as LedgerRow[]

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>

      {/* ── ZONE A: Status bar ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
        <Link href="/dashboard" style={CHIP_ZINC}>
          <span>Servers</span>
          <strong>{(serverCount ?? 2179).toLocaleString()}</strong>
        </Link>
        <Link href="/dashboard/agents" style={CHIP_ZINC}>
          <span>Agents</span>
          <strong>{agentCount ?? 0}</strong>
        </Link>
        <Link href="/dashboard/policies" style={CHIP_ZINC}>
          <span>Policies</span>
          <strong>{policyCount ?? 0}</strong>
        </Link>
        <Link href="/dashboard/threats" style={(threatCount ?? 0) > 0 ? CHIP_RED : CHIP_EMERALD}>
          <span>Threats 7d</span>
          <strong>{threatCount ?? 0}</strong>
        </Link>
        <Link href="/dashboard/anomalies" style={(anomalyCount ?? 0) > 0 ? CHIP_AMBER : CHIP_EMERALD}>
          <span>Anomalies</span>
          <strong>{anomalyCount ?? 0}</strong>
        </Link>
        <Link href="/dashboard/circuit-breakers" style={(cbCount ?? 0) > 0 ? CHIP_RED : CHIP_EMERALD}>
          <span>Breakers</span>
          <strong>{cbCount ?? 0}</strong>
        </Link>
      </div>

      {/* ── ZONE B: Three column grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 14 }} className="hud-grid">
        <style>{`@media(max-width:900px){.hud-grid{grid-template-columns:1fr!important}}`}</style>

        {/* Column 1: Threat Intelligence */}
        <div style={CARD}>
          <p style={COL_LABEL}>Threat Intelligence</p>

          {/* Recent threats */}
          {threats.length === 0 ? (
            <p style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: '#00c472', marginBottom: 12 }}>
              ✓ No recent threats
            </p>
          ) : (
            <div style={{ marginBottom: 12 }}>
              {threats.map(t => (
                <div key={t.id} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 8,
                  paddingBottom: 8, marginBottom: 8,
                  borderBottom: '1px solid var(--hair)',
                }}>
                  <span style={{
                    width: 6, height: 6, borderRadius: '50%', flexShrink: 0, marginTop: 4,
                    background: SEV_DOT[t.severity] ?? '#6b7280',
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--ink-soft)', marginBottom: 2 }}>
                      {THREAT_LABELS[t.event_type] ?? t.event_type}
                    </p>
                    <p style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--ink-faint)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {safeHostname(t.server_url)} · {relativeTime(t.created_at)}
                    </p>
                  </div>
                </div>
              ))}
              <Link href="/dashboard/threats" style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: '#00c472', textDecoration: 'none' }}>
                View all →
              </Link>
            </div>
          )}

          {/* Anomalies */}
          <div style={{ borderTop: '1px solid var(--hair)', paddingTop: 10, marginTop: 4 }}>
            {(anomalyCount ?? 0) > 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <p style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: '#f97316' }}>
                  ⚡ {anomalyCount} unacknowledged
                </p>
                <Link href="/dashboard/anomalies" style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: '#f97316', textDecoration: 'none' }}>
                  View →
                </Link>
              </div>
            ) : (
              <p style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: '#00c472' }}>✓ No anomalies</p>
            )}
          </div>

          {/* Circuit breakers */}
          <div style={{ borderTop: '1px solid var(--hair)', paddingTop: 10, marginTop: 10 }}>
            {(cbCount ?? 0) > 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <p style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: '#ef4444' }}>
                  🔴 {cbCount} breaker{cbCount === 1 ? '' : 's'} tripped
                </p>
                <Link href="/dashboard/circuit-breakers" style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: '#ef4444', textDecoration: 'none' }}>
                  View →
                </Link>
              </div>
            ) : (
              <p style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: '#00c472' }}>✓ No breakers tripped</p>
            )}
          </div>
        </div>

        {/* Column 2: Agent Activity */}
        <div style={CARD}>
          <p style={COL_LABEL}>Agent Activity</p>

          {/* API usage */}
          <div style={{ marginBottom: 14 }}>
            <UsageBar pct={pct} resetDate={resetDate} />
          </div>

          {/* Recent ledger */}
          <div style={{ borderTop: '1px solid var(--hair)', paddingTop: 10, marginBottom: 10 }}>
            {ledger.length === 0 ? (
              <p style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--ink-faint)', marginBottom: 8 }}>
                No activity yet
              </p>
            ) : (
              <div>
                {ledger.map(row => (
                  <div key={row.id} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    paddingBottom: 6, marginBottom: 6,
                    borderBottom: '1px solid var(--surface)',
                  }}>
                    <span style={{
                      width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                      background: RISK_DOT[row.risk_level ?? 'unknown'] ?? RISK_DOT.unknown,
                    }} />
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-muted)', flex: '0 0 auto', maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {row.tool_called}
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-faint)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {safeHostname(row.server_url)}
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-faint)', flexShrink: 0 }}>
                      {relativeTime(row.created_at)}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--ink-faint)' }}>
                {agentCount ?? 0} active agent{agentCount === 1 ? '' : 's'}
              </span>
              <Link href="/dashboard/ledger" style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: '#00c472', textDecoration: 'none' }}>
                View ledger →
              </Link>
            </div>
          </div>

          {/* API key */}
          <div style={{ borderTop: '1px solid var(--hair)', paddingTop: 10 }}>
            <p style={{ ...COL_LABEL, marginBottom: 8 }}>API key</p>
            <ApiKeyCard apiKey={profile.api_key} />
          </div>
        </div>

        {/* Column 3: Policy Status */}
        <div style={CARD}>
          <p style={COL_LABEL}>Policy Status</p>

          {policies.length === 0 ? (
            <>
              <p style={{ fontSize: 12, color: 'var(--ink-faint)', lineHeight: 1.6, marginBottom: 12 }}>
                No policies yet. Create rules to enforce safe behavior — block shell_exec, gate high-risk servers, enforce time windows.
              </p>
              <Link href="/dashboard/policies" style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                fontFamily: 'var(--font-mono)', fontSize: 12, color: '#00c472', textDecoration: 'none',
              }}>
                + Create policy →
              </Link>
            </>
          ) : (
            <>
              {policies.map(p => (
                <div key={p.id} style={{
                  display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8,
                  paddingBottom: 8, marginBottom: 8,
                  borderBottom: '1px solid var(--hair)',
                }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-soft)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.name}
                    </p>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-faint)' }}>
                      {policyCondition(p)}
                    </p>
                  </div>
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600, flexShrink: 0,
                    padding: '2px 6px', borderRadius: 4,
                    background: p.action === 'block' ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)',
                    color: p.action === 'block' ? '#ef4444' : '#f59e0b',
                  }}>
                    {p.action}
                  </span>
                </div>
              ))}
              <Link href="/dashboard/policies" style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: '#00c472', textDecoration: 'none' }}>
                View all {policyCount} {policyCount === 1 ? 'policy' : 'policies'} →
              </Link>
            </>
          )}
        </div>
      </div>

      {/* ── ZONE C: Quick actions ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {[
          { label: '+ Create Agent',       href: '/dashboard/agents' },
          { label: '+ Add Policy',         href: '/dashboard/policies' },
          { label: 'View Dependency Graph',href: '/dashboard/dependency-graph' },
          { label: 'Submit MCP Server',    href: '/submit-mcp' },
        ].map(({ label, href }) => (
          <Link
            key={href}
            href={href}
            style={{
              fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 400,
              padding: '7px 14px', borderRadius: 8, textDecoration: 'none',
              border: '1px solid var(--hair)',
              background: 'var(--surface)',
              color: 'var(--ink-muted)',
            }}
          >
            {label}
          </Link>
        ))}
        <a
          href="/api/compliance/report?format=json&period=90d&standard=soc2"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 400,
            padding: '7px 14px', borderRadius: 8, textDecoration: 'none',
            border: '1px solid var(--hair)',
            background: 'var(--surface)',
            color: 'var(--ink-muted)',
          }}
        >
          Export SOC 2 ↗
        </a>
      </div>
    </div>
  )
}
