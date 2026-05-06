import { redirect } from 'next/navigation'
import { createUserClient, createServiceRoleClient } from '@/lib/supabase-server'
import { assembleDepGraph } from '@/lib/dependency-graph'
import DependencyGraphClient from './_components/dependency-graph-client'

export const dynamic = 'force-dynamic'

const VALID_PERIODS: Record<string, number | null> = { '7d': 7, '30d': 30, '90d': 90, 'all': null }

export default async function DependencyGraphPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; highlight?: string }>
}) {
  const userClient = await createUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) redirect('/login')

  const { period: periodParam = '30d', highlight } = await searchParams
  const resolvedPeriod = periodParam in VALID_PERIODS ? periodParam : '30d'
  const periodDays = VALID_PERIODS[resolvedPeriod]

  const sb    = createServiceRoleClient()
  const graph = await assembleDepGraph(sb, user.id, periodDays)

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-semibold mb-1">Dependency Graph</h1>
        <p className="text-sm text-muted-foreground">
          Every MCP server your agents depend on — risk scores, data flows, circuit breaker status, and active threats in one view.
        </p>
      </div>
      <DependencyGraphClient
        graph={graph}
        initialPeriod={resolvedPeriod}
        highlightUrl={highlight ?? null}
      />
    </div>
  )
}
