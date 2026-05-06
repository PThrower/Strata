'use client'

import { useState, useTransition } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { getAnalytics } from './actions'
import type { AnalyticsData } from './types'
import { Glass } from '@/components/ui/glass'

const CallsChart = dynamic(() => import('./CallsChart'), {
  ssr: false,
  loading: () => <div style={{ height: 200 }} />,
})

const ACCENT = '#00c472'

const eyebrow: React.CSSProperties = {
  fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 500,
  letterSpacing: '0.15em', textTransform: 'uppercase' as const,
  color: 'var(--ink-faint)', margin: '0 0 8px',
}

type Days = 7 | 30 | 90

function StatusBadge({ code }: { code: number }) {
  const isRed = code === 401 || code >= 500
  const isAmber = code === 403 || code === 429
  const style: React.CSSProperties = isRed
    ? { color: '#ff7a45', background: 'rgba(255,122,69,0.10)', borderColor: 'rgba(255,122,69,0.32)' }
    : isAmber
    ? { color: '#f5b042', background: 'rgba(245,176,66,0.10)', borderColor: 'rgba(245,176,66,0.32)' }
    : { color: '#888888', background: 'rgba(136,136,136,0.10)', borderColor: 'rgba(136,136,136,0.30)' }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: '2px 8px',
      borderRadius: '8px', border: '1px solid',
      fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 500,
      ...style,
    }}>
      {code}
    </span>
  )
}

function HBar({ label, percentage }: { label: string; percentage: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
      <span
        style={{ fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.62)', fontSize: 12, width: 180, flexShrink: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
      >
        {label}
      </span>
      <div style={{ flex: 1, height: 6, borderRadius: 4, background: 'rgba(255,255,255,0.08)' }}>
        <div style={{ width: `${percentage}%`, height: '100%', borderRadius: 4, background: ACCENT }} />
      </div>
      <span className="text-muted-foreground tabular-nums" style={{ fontSize: 12, width: 34, textAlign: 'right' }}>
        {percentage}%
      </span>
    </div>
  )
}

export default function AnalyticsDashboard({ initialData }: { initialData: AnalyticsData }) {
  const [days, setDays] = useState<Days>(30)
  const [data, setData] = useState<AnalyticsData>(initialData)
  const [isPending, startTransition] = useTransition()

  const handleRange = (newDays: Days) => {
    if (newDays === days) return
    setDays(newDays)
    startTransition(async () => {
      const fresh = await getAnalytics(newDays)
      setData(fresh)
    })
  }

  // Empty state
  if (data.totalCalls === 0) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-serif text-2xl font-semibold">Analytics</h1>
          <RangeSelector days={days} onChange={handleRange} isPending={isPending} />
        </div>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p style={{ fontSize: 16, fontWeight: 500, color: 'var(--ink)', marginBottom: 8 }}>No API calls yet</p>
          <p style={{ fontSize: 13, color: 'var(--ink-muted)', marginBottom: 16 }}>
            Make your first call to see your usage analytics here.
          </p>
          <Link href="/docs" style={{ fontSize: 13, color: 'var(--emerald-glow)' }}>
            View docs →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto" style={{ opacity: isPending ? 0.6 : 1, transition: 'opacity 150ms' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 26, fontWeight: 500, color: 'var(--ink)', margin: 0 }}>Analytics</h1>
        <RangeSelector days={days} onChange={handleRange} isPending={isPending} />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
        <StatCard label="Total calls"          value={data.totalCalls.toLocaleString()}              sub={`in the last ${days} days`} />
        <StatCard label="Success rate"         value={`${data.successRate}%`}                        sub={`${data.errorCount} error${data.errorCount !== 1 ? 's' : ''} in period`} />
        <StatCard label="Most used tool"       value={data.mostUsedTool}                             sub={`${data.mostUsedToolCount.toLocaleString()} calls`} mono />
        <StatCard label="Most active ecosystem" value={data.mostActiveEcosystem}                    sub={`${data.mostActiveEcoCount.toLocaleString()} calls`} mono />
      </div>

      {/* Calls over time */}
      <Glass className="dash-card-hover" style={{ padding: 16, marginBottom: 16 }}>
        <p style={{ ...eyebrow, marginBottom: 16 }}>calls over time</p>
        <CallsChart data={data.dailyCounts} />
      </Glass>

      {/* Calls by tool + ecosystem */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <Glass className="dash-card-hover" style={{ padding: 16 }}>
          <p style={{ ...eyebrow, marginBottom: 16 }}>by tool</p>
          {data.toolCounts.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--ink-muted)' }}>No data</p>
          ) : (
            data.toolCounts.map((t) => (
              <HBar key={t.tool} label={t.tool} percentage={t.percentage} />
            ))
          )}
        </Glass>
        <Glass className="dash-card-hover" style={{ padding: 16 }}>
          <p style={{ ...eyebrow, marginBottom: 16 }}>by ecosystem</p>
          {data.ecosystemCounts.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--ink-muted)' }}>No data</p>
          ) : (
            data.ecosystemCounts.map((e) => (
              <HBar key={e.ecosystem} label={e.ecosystem} percentage={e.percentage} />
            ))
          )}
        </Glass>
      </div>

      {/* Recent errors */}
      <Glass className="dash-card-hover" style={{ padding: 16 }}>
        <p style={{ ...eyebrow, marginBottom: 12 }}>recent errors</p>
        {data.recentErrors.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--ink-muted)' }}>
            No errors yet.{' '}
            <Link href="/docs" style={{ color: 'var(--emerald-glow)' }}>
              Make your first call to see analytics here.
            </Link>
          </p>
        ) : (
          <table className="dash-table w-full" style={{ fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                {['Time', 'Tool', 'Ecosystem', 'Status'].map(h => (
                  <th key={h} style={{
                    textAlign: 'left', paddingBottom: 8,
                    fontFamily: 'var(--font-mono)', fontSize: 9,
                    fontWeight: 500, letterSpacing: '0.15em',
                    textTransform: 'uppercase', color: 'var(--ink-faint)',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.recentErrors.map((err, i) => (
                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '7px 0', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-faint)', fontVariantNumeric: 'tabular-nums' }}>{err.time}</td>
                  <td style={{ padding: '7px 8px 7px 0', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-soft)' }}>{err.tool}</td>
                  <td style={{ padding: '7px 8px 7px 0', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-soft)' }}>{err.ecosystem}</td>
                  <td style={{ padding: '7px 0' }}><StatusBadge code={err.statusCode} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Glass>
    </div>
  )
}

function StatCard({ label, value, sub, mono }: { label: string; value: string; sub: string; mono?: boolean }) {
  return (
    <Glass className="dash-card-hover" style={{ padding: 14 }}>
      <p style={{
        fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 500,
        letterSpacing: '0.15em', textTransform: 'uppercase',
        color: 'var(--ink-faint)', marginBottom: 6,
      }}>{label}</p>
      <p style={{
        fontSize: 20, fontWeight: 600, color: 'var(--ink)',
        fontFamily: mono ? 'var(--font-mono)' : undefined,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {value}
      </p>
      <p style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {sub}
      </p>
    </Glass>
  )
}

function RangeSelector({ days, onChange, isPending }: { days: Days; onChange: (d: Days) => void; isPending: boolean }) {
  const opts: Days[] = [7, 30, 90]
  return (
    <div style={{
      display: 'flex', gap: 2,
      border: '1px solid rgba(255,255,255,0.10)',
      borderRadius: 8, padding: 3,
      background: 'rgba(255,255,255,0.04)',
    }}>
      {opts.map((d) => (
        <button
          key={d} type="button" disabled={isPending}
          onClick={() => onChange(d)}
          style={{
            padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
            fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: days === d ? 500 : 400,
            background: days === d ? 'rgba(0,196,114,0.12)' : 'transparent',
            color: days === d ? '#00c472' : 'var(--ink-muted)',
            transition: 'background 150ms, color 150ms',
          }}
        >
          {d}d
        </button>
      ))}
    </div>
  )
}
