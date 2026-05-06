import { redirect } from 'next/navigation'
import { createUserClient, createServiceRoleClient } from '@/lib/supabase-server'
import AnomaliesClient, { type AnomalyEvent } from './_components/anomalies-client'

export const dynamic = 'force-dynamic'

export default async function AnomaliesPage() {
  const userClient = await createUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) redirect('/login')

  const sb = createServiceRoleClient()
  // eslint-disable-next-line react-hooks/purity
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString()

  const { data: events } = await sb
    .from('anomaly_events')
    .select(
      'id, event_type, severity, current_value, baseline_value, multiplier, detail, ' +
      'window_start, window_end, affected_server_urls, acknowledged, acknowledged_at, ' +
      'acknowledged_reason, created_at, agent_id',
    )
    .eq('profile_id', user.id)
    .gte('created_at', thirtyDaysAgo)
    .order('created_at', { ascending: false })
    .limit(200)

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div className="mb-8">
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '44px', fontWeight: 400, letterSpacing: '-0.022em', color: '#ffffff', margin: '0 0 8px' }}>Behavioral Anomalies</h1>
        <p className="text-sm text-muted-foreground">
          Deviations from your agents&apos; normal activity patterns — volume spikes, unusual
          risk concentrations, and off-hours net_egress surges. Strata detects anomalies
          after 7 days of baseline activity.
        </p>
      </div>
      <AnomaliesClient initialEvents={(events ?? []) as unknown as AnomalyEvent[]} />
    </div>
  )
}
