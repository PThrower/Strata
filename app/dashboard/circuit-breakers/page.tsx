import { redirect } from 'next/navigation'
import { createUserClient, createServiceRoleClient } from '@/lib/supabase-server'
import CircuitBreakersClient, { type BreakerRow } from './_components/circuit-breakers-client'

export const dynamic = 'force-dynamic'

export default async function CircuitBreakersPage() {
  const userClient = await createUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) redirect('/login')

  const sb = createServiceRoleClient()

  const [{ data: servers }, { data: resets }] = await Promise.all([
    sb
      .from('mcp_servers')
      .select('id, name, url, circuit_broken_at, circuit_broken_reason')
      .eq('circuit_broken', true)
      .order('circuit_broken_at', { ascending: false }),
    sb
      .from('circuit_breaker_resets')
      .select('server_id, reset_at, reset_reason')
      .eq('profile_id', user.id),
  ])

  const resetMap = new Map(
    (resets ?? []).map((r: { server_id: string; reset_at: string; reset_reason: string | null }) => [r.server_id, r])
  )

  const breakers: BreakerRow[] = (servers ?? []).map((s: { id: string; name: string; url: string | null; circuit_broken_at: string; circuit_broken_reason: string | null }) => ({
    server_id:          s.id,
    server_name:        s.name,
    server_url:         s.url,
    tripped_at:         s.circuit_broken_at,
    reason:             s.circuit_broken_reason,
    profile_reset:      resetMap.has(s.id),
    profile_reset_at:   resetMap.get(s.id)?.reset_at ?? null,
    profile_reset_reason: resetMap.get(s.id)?.reset_reason ?? null,
  }))

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div className="mb-8">
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '44px', fontWeight: 400, letterSpacing: '-0.022em', color: '#ffffff', margin: '0 0 8px' }}>Circuit Breakers</h1>
        <p className="text-sm text-muted-foreground">
          MCP servers that Strata has automatically circuit-broken due to a critical risk event — quarantine, prompt injection, or severe score drop.
          Your agents will see <code className="text-xs bg-muted px-1 py-0.5 rounded">circuit_broken: true</code> in verify responses.
          Reset to acknowledge a risk and continue using a server.
        </p>
      </div>
      <CircuitBreakersClient initialBreakers={breakers} />
    </div>
  )
}
