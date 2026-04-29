'use server'

import { redirect } from 'next/navigation'
import { createUserClient, createServiceRoleClient } from '@/lib/supabase-server'
import type { AnalyticsData, DailyCount, ToolCount, EcoCount, ErrorRow } from './types'

type RawRequest = {
  tool: string
  ecosystem: string
  status_code: number
  created_at: string
}

function computeAnalytics(rows: RawRequest[], days: number): AnalyticsData {
  const total = rows.length
  const successCount = rows.filter((r) => r.status_code === 200).length
  const errorCount = total - successCount
  const successRate = total === 0 ? 0 : Math.round((successCount / total) * 100)

  // Group by tool
  const toolMap: Record<string, number> = {}
  for (const r of rows) toolMap[r.tool] = (toolMap[r.tool] ?? 0) + 1
  const sortedTools = Object.entries(toolMap).sort((a, b) => b[1] - a[1])
  const mostUsedTool = sortedTools[0]?.[0] ?? '—'
  const mostUsedToolCount = sortedTools[0]?.[1] ?? 0

  // Group by ecosystem
  const ecoMap: Record<string, number> = {}
  for (const r of rows) ecoMap[r.ecosystem] = (ecoMap[r.ecosystem] ?? 0) + 1
  const sortedEcos = Object.entries(ecoMap).sort((a, b) => b[1] - a[1])
  const mostActiveEcosystem = sortedEcos[0]?.[0] ?? '—'
  const mostActiveEcoCount = sortedEcos[0]?.[1] ?? 0

  // Daily counts — build ordered map with zero-filled entries for every day in range
  const dayMap = new Map<string, number>()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date()
    d.setUTCDate(d.getUTCDate() - i)
    dayMap.set(d.toISOString().slice(0, 10), 0)
  }
  for (const r of rows) {
    const key = r.created_at.slice(0, 10)
    if (dayMap.has(key)) dayMap.set(key, (dayMap.get(key) ?? 0) + 1)
  }
  const dailyCounts: DailyCount[] = Array.from(dayMap.entries()).map(([key, count]) => ({
    // Parse as noon UTC to avoid DST/timezone shifts when formatting
    date: new Date(`${key}T12:00:00Z`).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
    count,
  }))

  // Tool + ecosystem breakdown with percentages
  const toolCounts: ToolCount[] = sortedTools.map(([tool, count]) => ({
    tool,
    count,
    percentage: total === 0 ? 0 : Math.round((count / total) * 100),
  }))
  const ecosystemCounts: EcoCount[] = sortedEcos.map(([ecosystem, count]) => ({
    ecosystem,
    count,
    percentage: total === 0 ? 0 : Math.round((count / total) * 100),
  }))

  // Recent errors
  const recentErrors: ErrorRow[] = rows
    .filter((r) => r.status_code !== 200)
    .slice(0, 10)
    .map((r) => ({
      time: new Date(r.created_at).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }),
      tool: r.tool,
      ecosystem: r.ecosystem,
      statusCode: r.status_code,
    }))

  return {
    totalCalls: total,
    successRate,
    errorCount,
    mostUsedTool,
    mostUsedToolCount,
    mostActiveEcosystem,
    mostActiveEcoCount,
    dailyCounts,
    toolCounts,
    ecosystemCounts,
    recentErrors,
  }
}

export async function getAnalytics(days: number): Promise<AnalyticsData> {
  const userClient = await createUserClient()
  const {
    data: { user },
  } = await userClient.auth.getUser()
  if (!user) redirect('/login')

  const serviceClient = createServiceRoleClient()
  const { data: profile } = await serviceClient
    .from('profiles')
    .select('api_key')
    .eq('id', user.id)
    .maybeSingle<{ api_key: string }>()
  if (!profile) redirect('/login')

  const since = new Date()
  since.setDate(since.getDate() - days)

  const { data } = await serviceClient
    .from('api_requests')
    .select('tool, ecosystem, status_code, created_at')
    .eq('api_key', profile.api_key)
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: false })
    .limit(50000)

  return computeAnalytics((data ?? []) as RawRequest[], days)
}
