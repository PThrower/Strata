import { redirect } from 'next/navigation'
import { createUserClient, createServiceRoleClient } from '@/lib/supabase-server'
import ThreatsClient, { type ThreatEvent } from './_components/threats-client'

export const dynamic = 'force-dynamic'

export default async function ThreatsPage() {
  const userClient = await createUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) redirect('/login')

  const sb        = createServiceRoleClient()
  // eslint-disable-next-line react-hooks/purity
  const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString()

  // Fetch recent threats (last 7 days) and the user's connected server URLs in parallel
  const [{ data: events }, { data: ledgerRows }] = await Promise.all([
    sb.from('threat_feed')
      .select('id, server_id, server_url, server_name, event_type, severity, old_value, new_value, detail, created_at')
      .gte('created_at', sevenDaysAgo)
      .order('created_at', { ascending: false })
      .limit(200),
    sb.from('agent_activity_ledger')
      .select('server_url')
      .eq('profile_id', user.id)
      .not('server_url', 'is', null),
  ])

  const affectedUrls = new Set(
    (ledgerRows ?? []).map((r: { server_url: string }) => r.server_url).filter(Boolean)
  )

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div className="mb-8">
        <h1 className="font-serif text-2xl font-semibold mb-1">Threat Feed</h1>
        <p className="text-sm text-muted-foreground">
          Risk signal changes for MCP servers — quarantines, new dangerous capability flags, score drops, and injection detections.
        </p>
      </div>
      <ThreatsClient
        initialEvents={(events ?? []) as unknown as ThreatEvent[]}
        affectedUrls={[...affectedUrls]}
      />
    </div>
  )
}
