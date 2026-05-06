import { redirect } from 'next/navigation'
import { createUserClient, createServiceRoleClient } from '@/lib/supabase-server'
import PoliciesClient, { type PolicyRow } from './_components/policies-client'

export const dynamic = 'force-dynamic'

export default async function PoliciesPage() {
  const userClient = await createUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) redirect('/login')

  const sb = createServiceRoleClient()
  const { data } = await sb
    .from('policies')
    .select(
      'id, name, description, enabled, action, match_capability_flags, match_risk_level_gte, ' +
      'match_tool_names, time_start_hour, time_end_hour, agent_id, priority, created_at'
    )
    .eq('profile_id', user.id)
    .order('priority', { ascending: true })
    .order('created_at', { ascending: true })

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div className="mb-8">
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '44px', fontWeight: 400, letterSpacing: '-0.022em', color: '#ffffff', margin: '0 0 8px' }}>Policies</h1>
        <p className="text-sm text-muted-foreground">
          Rules that govern what your agents are allowed to do. Enforced at the Strata layer before any tool call executes.
        </p>
      </div>
      <PoliciesClient initialPolicies={(data ?? []) as unknown as PolicyRow[]} />
    </div>
  )
}
