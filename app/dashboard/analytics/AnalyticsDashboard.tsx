'use client'

import { useState, useTransition } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { getAnalytics } from './actions'
import type { AnalyticsData } from './types'

const CallsChart = dynamic(() => import('./CallsChart'), {
  ssr: false,
  loading: () => <div style={{ height: 200 }} />,
})

const card = 'bg-white dark:bg-zinc-900 rounded-lg border border-border p-4'
const ACCENT = '#00c472'

type Days = 7 | 30 | 90

function StatusBadge({ code }: { code: number }) {
  const isRed = code === 401 || code === 500 || code >= 500
  const isAmber = code === 403 || code === 429
  const cls = isRed
    ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
    : isAmber
    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
    : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium ${cls}`}>
      {code}
    </span>
  )
}

function HBar({ label, percentage }: { label: string; percentage: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
      <span
        className="text-muted-foreground font-mono"
        style={{ fontSize: 12, width: 180, flexShrink: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
      >
        {label}
      </span>
      <div style={{ flex: 1, height: 6, borderRadius: 4, background: 'rgba(0,0,0,0.06)' }} className="dark:bg-zinc-700">
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
      <div className="max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-serif text-2xl font-semibold">Analytics</h1>
          <RangeSelector days={days} onChange={handleRange} isPending={isPending} />
        </div>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-lg font-medium mb-2">No API calls yet</p>
          <p className="text-sm text-muted-foreground mb-4">
            Make your first call to see your usage analytics here.
          </p>
          <Link href="/docs" className="text-sm" style={{ color: ACCENT }}>
            View docs →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl" style={{ opacity: isPending ? 0.6 : 1, transition: 'opacity 150ms' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-2xl font-semibold">Analytics</h1>
        <RangeSelector days={days} onChange={handleRange} isPending={isPending} />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Total calls"
          value={data.totalCalls.toLocaleString()}
          sub={`in the last ${days} days`}
        />
        <StatCard
          label="Success rate"
          value={`${data.successRate}%`}
          sub={`${data.errorCount} error${data.errorCount !== 1 ? 's' : ''} in period`}
        />
        <StatCard
          label="Most used tool"
          value={data.mostUsedTool}
          sub={`${data.mostUsedToolCount.toLocaleString()} calls`}
          mono
        />
        <StatCard
          label="Most active ecosystem"
          value={data.mostActiveEcosystem}
          sub={`${data.mostActiveEcoCount.toLocaleString()} calls`}
          mono
        />
      </div>

      {/* Calls over time */}
      <div className={`${card} mb-6`}>
        <p className="text-sm font-medium mb-4">Calls over time</p>
        <CallsChart data={data.dailyCounts} />
      </div>

      {/* Calls by tool + ecosystem */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
        <div className={card}>
          <p className="text-sm font-medium mb-4">By tool</p>
          {data.toolCounts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No data</p>
          ) : (
            data.toolCounts.map((t) => (
              <HBar key={t.tool} label={t.tool} percentage={t.percentage} />
            ))
          )}
        </div>
        <div className={card}>
          <p className="text-sm font-medium mb-4">By ecosystem</p>
          {data.ecosystemCounts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No data</p>
          ) : (
            data.ecosystemCounts.map((e) => (
              <HBar key={e.ecosystem} label={e.ecosystem} percentage={e.percentage} />
            ))
          )}
        </div>
      </div>

      {/* Recent errors */}
      <div className={card}>
        <p className="text-sm font-medium mb-3">Recent errors</p>
        {data.recentErrors.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No errors yet.{' '}
            <Link href="/docs" style={{ color: ACCENT }}>
              Make your first call to see analytics here.
            </Link>
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground border-b border-border">
                <th className="text-left pb-2 font-medium">Time</th>
                <th className="text-left pb-2 font-medium">Tool</th>
                <th className="text-left pb-2 font-medium">Ecosystem</th>
                <th className="text-left pb-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.recentErrors.map((err, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  <td className="py-2 text-xs text-muted-foreground tabular-nums">{err.time}</td>
                  <td className="py-2 font-mono text-xs">{err.tool}</td>
                  <td className="py-2 font-mono text-xs">{err.ecosystem}</td>
                  <td className="py-2">
                    <StatusBadge code={err.statusCode} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  sub,
  mono,
}: {
  label: string
  value: string
  sub: string
  mono?: boolean
}) {
  return (
    <div className={card}>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p
        className="font-medium truncate"
        style={{ fontSize: 22, fontFamily: mono ? 'ui-monospace, "SF Mono", Menlo, monospace' : undefined }}
      >
        {value}
      </p>
      <p className="text-xs text-muted-foreground mt-0.5 truncate">{sub}</p>
    </div>
  )
}

function RangeSelector({
  days,
  onChange,
  isPending,
}: {
  days: Days
  onChange: (d: Days) => void
  isPending: boolean
}) {
  const opts: Days[] = [7, 30, 90]
  return (
    <div className="flex items-center gap-1 rounded-md border border-border p-0.5">
      {opts.map((d) => (
        <button
          key={d}
          type="button"
          disabled={isPending}
          onClick={() => onChange(d)}
          className={`px-3 py-1.5 text-xs rounded transition-colors ${
            days === d
              ? 'bg-zinc-100 dark:bg-zinc-800 font-medium text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {d} days
        </button>
      ))}
    </div>
  )
}
