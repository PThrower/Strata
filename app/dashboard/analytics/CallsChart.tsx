'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { DailyCount } from './types'

export default function CallsChart({ data }: { data: DailyCount[] }) {
  const hasData = data.some((d) => d.count > 0)

  if (!hasData) {
    return (
      <div
        style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        className="text-sm text-muted-foreground"
      >
        No API calls in this period
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.06)" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <Tooltip
          cursor={{ fill: 'rgba(0,196,114,0.06)' }}
          contentStyle={{
            borderRadius: 8,
            border: '1px solid rgba(0,0,0,0.08)',
            fontSize: 12,
          }}
        />
        <Bar dataKey="count" fill="#00c472" radius={[3, 3, 0, 0]} name="calls" />
      </BarChart>
    </ResponsiveContainer>
  )
}
