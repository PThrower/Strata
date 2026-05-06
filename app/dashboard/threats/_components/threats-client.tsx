'use client'

import { useState } from 'react'
import Link from 'next/link'

import { RiskBadge } from '../../_components/RiskBadge'

const CARD: React.CSSProperties = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: 12,
}

export interface ThreatEvent {
  id:                        string
  server_id:                 string
  server_url:                string | null
  server_name:               string | null
  event_type:                string
  severity:                  'critical' | 'high' | 'medium' | 'low'
  old_value:                 Record<string, unknown> | null
  new_value:                 Record<string, unknown> | null
  detail:                    string | null
  created_at:                string
  triggered_circuit_breaker: boolean
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60)        return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60)        return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24)        return `${h}h ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function shortHost(url: string | null): string {
  if (!url) return '—'
  try { return new URL(url).hostname } catch { return url }
}


const EVENT_LABELS: Record<string, string> = {
  quarantine_added:     '⛔ Quarantined',
  quarantine_removed:   '✓ Unquarantined',
  capability_flag_added:'🚩 Flag added',
  score_critical_drop:  '📉 Score critical',
  score_significant_drop:'📉 Score drop',
  injection_detected:   '💉 Injection',
}

// Extract newly added flags from event for the "Block this flag" button
function addedFlags(event: ThreatEvent): string[] {
  if (event.event_type !== 'capability_flag_added') return []
  const raw = event.new_value?.added_flags
  if (Array.isArray(raw)) return raw as string[]
  return []
}

type FilterMode = 'all' | 'high' | 'mine'

export default function ThreatsClient({
  initialEvents,
  affectedUrls,
}: {
  initialEvents: ThreatEvent[]
  affectedUrls:  string[]
}) {
  const [filter, setFilter] = useState<FilterMode>('mine')
  const affectedSet = new Set(affectedUrls)

  const filtered = initialEvents.filter(e => {
    if (filter === 'high')     return e.severity === 'critical' || e.severity === 'high'
    if (filter === 'mine')     return e.server_url ? affectedSet.has(e.server_url) : false
    return true
  })

  const critCount = initialEvents.filter(e => e.severity === 'critical').length
  const highCount = initialEvents.filter(e => e.severity === 'high').length
  const mineCount = initialEvents.filter(e => e.server_url && affectedSet.has(e.server_url)).length

  const tabBase = 'px-3 py-1.5 text-xs rounded-md border transition-colors'

  return (
    <>
      {/* ── Summary cards ── */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Critical', count: critCount, color: '#ef4444' },
          { label: 'High',     count: highCount, color: '#f59e0b' },
          { label: 'My servers', count: mineCount, color: 'var(--emerald-glow)' },
        ].map(({ label, count, color }) => (
          <div key={label} style={{ ...CARD, padding: '12px 16px' }}>
            <p className="text-xs text-muted-foreground mb-1">{label}</p>
            <p style={{ fontSize: 24, fontWeight: 600, color, fontVariantNumeric: 'tabular-nums' }}>
              {count}
            </p>
          </div>
        ))}
      </div>

      {/* ── Filter bar ── */}
      <div className="flex items-center gap-2 mb-4">
        {([['all', 'All events'], ['high', '⚠ Critical + High'], ['mine', 'My servers']] as const).map(([mode, label]) => (
          <button
            key={mode}
            onClick={() => setFilter(mode)}
            className={`${tabBase} ${filter === mode
              ? 'border-border bg-zinc-100 dark:bg-zinc-800 font-medium text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            {label}
          </button>
        ))}
        <span className="text-xs text-muted-foreground ml-auto">{filtered.length} event{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* ── Empty state ── */}
      {filtered.length === 0 ? (
        <div style={{ ...CARD, padding: 48, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <p className="text-base font-medium mb-2">
            {filter === 'mine' ? 'No threats affecting your connected servers.' : 'No threat events in this period.'}
          </p>
          <p className="text-sm text-muted-foreground">
            {filter === 'mine'
              ? 'Strata monitors 2,000+ MCP servers continuously.'
              : 'The feed covers the last 7 days. Threats appear here when a server changes risk profile.'}
          </p>
        </div>
      ) : (
        <div style={{ ...CARD, overflowX: 'auto' }}>
          <table className="w-full text-sm">
            <thead style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <tr style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 500, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>
                <th className="px-4 py-3 font-medium">Time</th>
                <th className="px-4 py-3 font-medium">Server</th>
                <th className="px-4 py-3 font-medium">Event</th>
                <th className="px-4 py-3 font-medium">Severity</th>
                <th className="px-4 py-3 font-medium">Detail</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(event => {
                const flags = addedFlags(event)
                return (
                  <tr key={event.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap text-xs" title={event.created_at}>
                      {relativeTime(event.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      {event.server_url ? (
                        <a
                          href={event.server_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-xs text-muted-foreground hover:text-foreground transition-colors"
                          title={event.server_url}
                        >
                          {shortHost(event.server_url)}
                        </a>
                      ) : (
                        <span className="font-mono text-xs text-muted-foreground">
                          {event.server_name ?? '—'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontFamily: 'var(--font-mono)', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.65)' }}>
                        {EVENT_LABELS[event.event_type] ?? event.event_type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <RiskBadge level={event.severity} />
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-xs truncate" title={event.detail ?? undefined}>
                      {event.detail ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        {event.triggered_circuit_breaker && (
                          <Link
                            href="/dashboard/circuit-breakers"
                            className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded font-medium bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 ring-1 ring-red-500/30"
                            title="This event tripped a circuit breaker"
                          >
                            ⚡ CB
                          </Link>
                        )}
                        {event.server_url && affectedSet.has(event.server_url) && (
                          <Link
                            href={`/dashboard/dependency-graph?highlight=${encodeURIComponent(event.server_url)}`}
                            className="text-xs px-2.5 py-1 rounded-md border border-border bg-background hover:bg-zinc-100 dark:hover:bg-zinc-800 text-muted-foreground hover:text-foreground transition-colors"
                            title="View this server in your dependency graph"
                          >
                            View in graph →
                          </Link>
                        )}
                        {flags.length > 0 && (
                          <Link
                            href={`/dashboard/policies?prefill=capability_flag&value=${flags[0]}`}
                            className="text-xs px-2.5 py-1 rounded-md border border-border bg-background hover:bg-red-50 dark:hover:bg-red-950 text-muted-foreground hover:text-red-600 transition-colors"
                          >
                            Block {flags[0]}
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
