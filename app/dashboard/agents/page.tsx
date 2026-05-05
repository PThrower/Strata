import { redirect } from 'next/navigation'
import { createUserClient, createServiceRoleClient } from '@/lib/supabase-server'
import AgentsClient, { type AgentRow } from './_components/agents-client'

export const dynamic = 'force-dynamic'

export default async function AgentsPage() {
  const userClient = await createUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) redirect('/login')

  const sb = createServiceRoleClient()
  const { data } = await sb
    .from('agent_identities')
    .select('id, agent_id, name, description, capabilities, created_at, expires_at, last_verified_at, revoked_at, revocation_reason')
    .eq('profile_id', user.id)
    .order('created_at', { ascending: false })

  const agents = (data ?? []) as AgentRow[]

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div className="mb-8">
        <h1 className="font-serif text-2xl font-semibold mb-1">Agent Identities</h1>
        <p className="text-sm text-muted-foreground">
          Cryptographic identities for agents you operate. Each identity issues an Ed25519-signed JWT
          that MCP servers and x402 endpoints verify before honouring tool calls.
        </p>
      </div>
      <AgentsClient initialAgents={agents} />
    </div>
  )
}
