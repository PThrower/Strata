'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'

import { RiskBadge } from '../../_components/RiskBadge'

const CARD: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--hair)',
  borderRadius: 12,
}

export interface AnomalyEvent {
  id:                   string
  event_type:           'volume_spike' | 'high_risk_surge' | 'net_egress_surge'
  severity:             'critical' | 'high' | 'medium' | 'low'
  current_value:        number
  baseline_value:       number
  multiplier:           number
  detail:               string
  window_start:         string
  window_end:           string
  affected_server_urls: string[] | null
  acknowledged:         boolean
  acknowledged_at:      string | null
  acknowledged_reason:  string | null
  created_at:           string
  agent_id:             string | null
}

const EVENT_LABELS: Record<string, string> = {
  volume_spike:     '📈 Volume spike',
  high_risk_surge:  '⚠ High-risk surge',
  net_egress_surge: '↗ Net-egress surge',
}


function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60)  return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60)  return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24)  return `${h}h ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function shortHost(url: string): string {
  try { return new URL(url).hostname } catch { return url }
}

type Filter = 'all' | 'unacknowledged' | 'high'

export default function AnomaliesClient({ initialEvents }: { initialEvents: AnomalyEvent[] }) {
  const [events,    setEvents]    = useState<AnomalyEvent[]>(initialEvents)
  const [filter,    setFilter]    = useState<Filter>('unacknowledged')
  const [ackTarget, setAckTarget] = useState<AnomalyEvent | null>(null)
  const [ackReason, setAckReason] = useState('')
  const [error,     setError]     = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const unackedCount = events.filter(e => !e.acknowledged).length
  const critCount    = events.filter(e => e.severity === 'critical').length
  const highCount    = events.filter(e => e.severity === 'high').length

  const filtered = events.filter(e => {
    if (filter === 'unacknowledged') return !e.acknowledged
    if (filter === 'high')           return e.severity === 'critical' || e.severity === 'high'
    return true
  })

  function submitAck() {
    if (!ackTarget) return
    startTransition(async () => {
      setError(null)
      const res = await fetch(`/api/v1/anomalies/${ackTarget.id}/acknowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: ackReason || undefined }),
      })
      if (!res.ok) {
        const d = await res.json() as { error?: string }
        setError(d.error ?? 'Acknowledge failed')
        return
      }
      setEvents(prev => prev.map(e =>
        e.id === ackTarget.id
          ? { ...e, acknowledged: true, acknowledged_at: new Date().toISOString(), acknowledged_reason: ackReason || null }
          : e
      ))
      setAckTarget(null)
      setAckReason('')
    })
  }

  const tabBase = 'px-3 py-1.5 text-xs rounded-md border transition-colors'

  return (
    <>
      {/* ── Summary cards ── */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total',          count: events.length,     color: 'var(--foreground)' },
          { label: 'Unacknowledged', count: unackedCount,      color: '#f97316' },
          { label: 'Critical',       count: critCount,         color: '#ef4444' },
          { label: 'High',           count: highCount,         color: '#f97316' },
        ].map(({ label, count, color }) => (
          <div key={label} style={{ ...CARD, padding: '12px 16px' }}>
            <p className="text-xs text-muted-foreground mb-1">{label}</p>
            <p style={{ fontSize: 24, fontWeight: 600, color, fontVariantNumeric: 'tabular-nums' }}>{count}</p>
          </div>
        ))}
      </div>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      {/* ── Filter bar ── */}
      <div className="flex items-center gap-2 mb-4">
        {([
          ['unacknowledged', 'Unacknowledged'],
          ['high',           '⚠ Critical + High'],
          ['all',            'All events'],
        ] as [Filter, string][]).map(([f, label]) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`${tabBase} ${filter === f
              ? 'border-border bg-zinc-100 dark:bg-zinc-800 font-medium text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            {label}
          </button>
        ))}
        <span className="text-xs text-muted-foreground ml-auto">
          {filtered.length} event{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── Empty state ── */}
      {filtered.length === 0 ? (
        <div style={{ ...CARD, padding: 48, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <p className="text-base font-medium mb-2">
            {filter === 'unacknowledged'
              ? 'No unacknowledged anomalies.'
              : 'No anomaly events in this period.'}
          </p>
          <p className="text-sm text-muted-foreground max-w-md">
            {events.length === 0
              ? 'Anomaly detection activates after 7 days of baseline activity and 50+ calls. Keep using your agents and check back.'
              : 'All events in the last 30 days have been acknowledged.'}
          </p>
        </div>
      ) : (
        <div style={{ ...CARD, overflowX: 'auto' }}>
          <table className="w-full text-sm">
            <thead style={{ borderBottom: '1px solid var(--hair)' }}>
              <tr style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 500, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--ink-faint)' }}>
                <th className="px-4 py-3 font-medium">Time</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Severity</th>
                <th className="px-4 py-3 font-medium">Multiplier</th>
                <th className="px-4 py-3 font-medium">Detail</th>
                <th className="px-4 py-3 font-medium">Servers</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(event => (
                <tr
                  key={event.id}
                  style={{ borderBottom: '1px solid var(--hair)', opacity: event.acknowledged ? 0.5 : 1 }}
                >
                  <td
                    className="px-4 py-3 text-muted-foreground whitespace-nowrap text-xs"
                    title={event.created_at}
                  >
                    {relativeTime(event.created_at)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontFamily: 'var(--font-mono)', background: 'rgba(255,255,255,0.06)', color: 'var(--ink-muted)' }}>
                      {EVENT_LABELS[event.event_type] ?? event.event_type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <RiskBadge level={event.severity} />
                  </td>
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-foreground whitespace-nowrap">
                    {event.multiplier.toFixed(1)}×
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground max-w-xs" title={event.detail}>
                    <p className="truncate">{event.detail}</p>
                    {event.acknowledged && event.acknowledged_reason && (
                      <p className="text-[10px] italic mt-0.5 text-muted-foreground truncate">
                        Acked: {event.acknowledged_reason}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground max-w-[160px]">
                    {(event.affected_server_urls ?? []).slice(0, 2).map(url => (
                      <div key={url} className="font-mono truncate text-[10px]">{shortHost(url)}</div>
                    ))}
                    {(event.affected_server_urls ?? []).length > 2 && (
                      <div className="text-[10px] text-muted-foreground">
                        +{(event.affected_server_urls ?? []).length - 2} more
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {!event.acknowledged && (
                      <button
                        onClick={() => { setAckTarget(event); setAckReason('') }}
                        className="text-xs px-2.5 py-1 rounded-md border border-border bg-background hover:bg-zinc-100 dark:hover:bg-zinc-800 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Acknowledge
                      </button>
                    )}
                    {event.affected_server_urls && event.affected_server_urls.length > 0 && (
                      <Link
                        href={`/dashboard/dependency-graph?highlight=${encodeURIComponent(event.affected_server_urls[0])}`}
                        className="ml-2 text-xs px-2.5 py-1 rounded-md border border-border bg-background hover:bg-zinc-100 dark:hover:bg-zinc-800 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        View in graph →
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Acknowledge modal ── */}
      {ackTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-border p-6 w-full max-w-md shadow-xl">
            <h2 className="font-serif text-lg font-semibold mb-1">Acknowledge anomaly</h2>
            <p className="text-sm text-muted-foreground mb-4">
              {EVENT_LABELS[ackTarget.event_type]} — {ackTarget.detail}
            </p>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Reason (optional)
            </label>
            <input
              type="text"
              value={ackReason}
              onChange={e => setAckReason(e.target.value)}
              placeholder="e.g. expected load test, false positive"
              className="w-full text-sm border border-border rounded-md px-3 py-2 bg-background mb-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              maxLength={500}
            />
            {error && <p className="text-xs text-red-600 mb-3">{error}</p>}
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setAckTarget(null)}
                disabled={isPending}
                className="text-xs px-3 py-1.5 rounded-md border border-border bg-background hover:bg-zinc-100 dark:hover:bg-zinc-800 text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitAck}
                disabled={isPending}
                className="text-xs px-3 py-1.5 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                {isPending ? 'Acknowledging…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
