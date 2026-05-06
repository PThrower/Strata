'use client'

import { useState, useTransition } from 'react'

export interface BreakerRow {
  server_id:            string
  server_name:          string
  server_url:           string | null
  tripped_at:           string
  reason:               string | null
  profile_reset:        boolean
  profile_reset_at:     string | null
  profile_reset_reason: string | null
}

function relativeDate(iso: string): string {
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

const BTN_GHOST: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', padding: '8px 16px', borderRadius: '999px',
  fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 500, cursor: 'pointer',
  border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.05)',
  color: 'rgba(255,255,255,0.65)', transition: 'opacity 150ms',
}
const BTN_DANGER: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', padding: '8px 16px', borderRadius: '999px',
  fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 500, cursor: 'pointer',
  border: '1px solid rgba(255,122,69,0.32)', background: 'rgba(255,122,69,0.08)',
  color: '#ff7a45', transition: 'opacity 150ms',
}

export default function CircuitBreakersClient({ initialBreakers }: { initialBreakers: BreakerRow[] }) {
  const [breakers, setBreakers] = useState<BreakerRow[]>(initialBreakers)
  const [resetTarget, setResetTarget]   = useState<BreakerRow | null>(null)
  const [resetReason, setResetReason]   = useState('')
  const [error, setError]               = useState<string | null>(null)
  const [isPending, startTransition]    = useTransition()

  const CARD: React.CSSProperties = { background: 'linear-gradient(135deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 35%, rgba(255,255,255,0.02) 70%, rgba(0,196,114,0.05) 100%)', backdropFilter: 'blur(28px) saturate(180%)', WebkitBackdropFilter: 'blur(28px) saturate(180%)', border: '1px solid rgba(255,255,255,0.10)', borderTopColor: 'rgba(255,255,255,0.28)', borderLeftColor: 'rgba(255,255,255,0.20)', borderRadius: '22px', boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.30), inset 1px 0 0 0 rgba(255,255,255,0.14), inset 0 -1px 0 0 rgba(0,0,0,0.30), inset 0 0 36px 0 rgba(0,196,114,0.04), 0 24px 60px -24px rgba(0,0,0,0.7), 0 4px 14px -4px rgba(0,0,0,0.4)' }

  function handleReset(row: BreakerRow) {
    setResetTarget(row)
    setResetReason('')
    setError(null)
  }

  function submitReset() {
    if (!resetTarget) return
    startTransition(async () => {
      setError(null)
      const res = await fetch(`/api/v1/circuit-breakers/${resetTarget.server_id}/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: resetReason || undefined }),
      })
      if (!res.ok) {
        const data = await res.json() as { error?: string }
        setError(data.error ?? 'Reset failed')
        return
      }
      const data = await res.json() as { reset_at: string; reset_reason: string | null }
      setBreakers(prev => prev.map(b =>
        b.server_id === resetTarget!.server_id
          ? { ...b, profile_reset: true, profile_reset_at: data.reset_at, profile_reset_reason: data.reset_reason }
          : b
      ))
      setResetTarget(null)
    })
  }

  function revokeReset(row: BreakerRow) {
    startTransition(async () => {
      setError(null)
      const res = await fetch(`/api/v1/circuit-breakers/${row.server_id}/reset`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json() as { error?: string }
        setError(data.error ?? 'Revoke failed')
        return
      }
      setBreakers(prev => prev.map(b =>
        b.server_id === row.server_id
          ? { ...b, profile_reset: false, profile_reset_at: null, profile_reset_reason: null }
          : b
      ))
    })
  }

  const resetCount  = breakers.filter(b => b.profile_reset).length
  const activeCount = breakers.filter(b => !b.profile_reset).length

  return (
    <>
      {/* ── Summary cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Total tripped',  count: breakers.length, color: '#ef4444'              },
          { label: 'Blocking you',   count: activeCount,     color: '#f59e0b'              },
          { label: 'Your resets',    count: resetCount,      color: 'var(--emerald-glow)'  },
        ].map(({ label, count, color }) => (
          <div key={label} style={{ ...CARD, padding: '12px 16px' }}>
            <p className="text-xs text-muted-foreground mb-1">{label}</p>
            <p style={{ fontSize: 24, fontWeight: 600, color, fontVariantNumeric: 'tabular-nums' }}>
              {count}
            </p>
          </div>
        ))}
      </div>

      {error && (
        <p className="text-sm text-red-600 mb-4">{error}</p>
      )}

      {/* ── Empty state ── */}
      {breakers.length === 0 ? (
        <div style={{ ...CARD, padding: 48, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <p className="text-base font-medium mb-2">No circuit breakers tripped.</p>
          <p className="text-sm text-muted-foreground">
            Strata automatically trips circuit breakers when a connected server is quarantined,
            has a critical score drop, or has prompt injection detected.
          </p>
        </div>
      ) : (
        <div style={{ ...CARD, overflowX: 'auto' }}>
          <table className="w-full text-sm">
            <thead className="text-left border-b border-border">
              <tr className="text-xs text-muted-foreground uppercase tracking-wider">
                <th className="px-4 py-3 font-medium">Server</th>
                <th className="px-4 py-3 font-medium">Tripped</th>
                <th className="px-4 py-3 font-medium">Reason</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {breakers.map(row => (
                <tr key={row.server_id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-medium text-sm">{row.server_name}</p>
                    {row.server_url && (
                      <a
                        href={row.server_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-xs text-muted-foreground hover:text-foreground transition-colors"
                        title={row.server_url}
                      >
                        {shortHost(row.server_url)}
                      </a>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap" title={row.tripped_at}>
                    {relativeDate(row.tripped_at)}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground max-w-xs truncate" title={row.reason ?? undefined}>
                    {row.reason ?? '—'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {row.profile_reset ? (
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                        title={row.profile_reset_at ? `Reset ${relativeDate(row.profile_reset_at)}${row.profile_reset_reason ? `: ${row.profile_reset_reason}` : ''}` : undefined}
                      >
                        ✓ Reset by you
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 ring-1 ring-red-500/30">
                        ⚡ Tripped
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {row.profile_reset ? (
                      <button
                        onClick={() => revokeReset(row)}
                        disabled={isPending}
                        style={BTN_DANGER}
                      >
                        Revoke reset
                      </button>
                    ) : (
                      <button
                        onClick={() => handleReset(row)}
                        disabled={isPending}
                        style={BTN_GHOST}
                      >
                        Reset for me
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Reset confirmation modal ── */}
      {resetTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(4,5,12,0.65)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 35%, rgba(0,196,114,0.05) 100%)', backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)', border: '1px solid rgba(255,255,255,0.16)', borderRadius: '22px', padding: '24px', maxWidth: 480, width: '100%' }}>
            <h2 className="font-serif text-lg font-semibold mb-1">Reset circuit breaker</h2>
            <p className="text-sm text-muted-foreground mb-4">
              This acknowledges the risk for <strong>{resetTarget.server_name}</strong> and allows your agents to connect.
              The global circuit breaker remains active for other users.
            </p>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Reason (optional)
            </label>
            <input
              type="text"
              value={resetReason}
              onChange={e => setResetReason(e.target.value)}
              placeholder="e.g. internal server, risk reviewed"
              className="w-full text-sm border border-border rounded-md px-3 py-2 bg-background mb-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              maxLength={500}
            />
            {error && <p className="text-xs text-red-600 mb-3">{error}</p>}
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setResetTarget(null)}
                disabled={isPending}
                style={BTN_GHOST}
              >
                Cancel
              </button>
              <button
                onClick={submitReset}
                disabled={isPending}
                className="text-xs px-3 py-1.5 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                {isPending ? 'Resetting…' : 'Confirm reset'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
