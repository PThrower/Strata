import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createUserClient, createServiceRoleClient } from '@/lib/supabase-server'
import { FREE_LIMIT, PRO_LIMIT } from '@/lib/api-auth'
import { Glass } from '@/components/ui/glass'
import ApiKeyCard from './_components/api-key-card'
import UpgradeCTA from './_components/upgrade-cta'
import { UsageBar } from './_components/UsageBar'

type DashboardProfile = {
  id: string
  api_key: string
  tier: string
  calls_used: number
  calls_reset_at: string | null
  lifetime_pro: boolean
}

type ApiRequest = {
  id: string
  tool: string
  ecosystem: string
  status_code: number
  created_at: string
}

function formatResetDate(iso: string | null): string {
  if (!iso) return 'N/A'
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  })
}

function formatRequestTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  })
}

const eyebrow: React.CSSProperties = {
  fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 500,
  letterSpacing: '0.15em', textTransform: 'uppercase',
  color: 'var(--ink-faint)', margin: '0 0 8px',
}

export default async function DashboardPage() {
  const userClient = await createUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) redirect('/login')

  const serviceClient = createServiceRoleClient()

  const { data: profile } = await serviceClient
    .from('profiles')
    .select('id, api_key, tier, calls_used, calls_reset_at, lifetime_pro')
    .eq('id', user.id)
    .maybeSingle<DashboardProfile>()

  if (!profile) redirect('/login')

  const { data: recentRequests } = await serviceClient
    .from('api_requests')
    .select('id, tool, ecosystem, status_code, created_at')
    .eq('api_key', profile.api_key)
    .order('created_at', { ascending: false })
    .limit(10)

  const limit    = profile.tier === 'pro' ? PRO_LIMIT : FREE_LIMIT
  const pct      = Math.min((profile.calls_used / limit) * 100, 100)
  const resetDate = formatResetDate(profile.calls_reset_at)
  const requests  = (recentRequests ?? []) as ApiRequest[]

  return (
    <div className="max-w-2xl mx-auto">
      <h1 style={{
        fontFamily: 'var(--font-serif)', fontSize: 26, fontWeight: 500,
        letterSpacing: '-0.01em', color: 'var(--ink)', margin: '0 0 24px',
      }}>
        Overview
      </h1>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <Glass shimmer className="dash-stagger-card dash-card-hover" style={{ padding: 16, animationDelay: '0ms' }}>
          <p style={eyebrow}>api calls this month</p>
          <p style={{ fontSize: 20, fontWeight: 600, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>
            {profile.calls_used.toLocaleString()}{' '}
            <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--ink-muted)' }}>
              / {limit.toLocaleString()}
            </span>
          </p>
        </Glass>

        <Glass shimmer className="dash-stagger-card dash-card-hover" style={{ padding: 16, animationDelay: '60ms' }}>
          <p style={eyebrow}>current tier</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center',
              padding: '2px 10px', borderRadius: 999,
              fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 500,
              background: profile.tier === 'pro'
                ? 'rgba(0,196,114,0.12)'
                : 'rgba(255,255,255,0.08)',
              color: profile.tier === 'pro' ? '#00c472' : 'var(--ink-muted)',
            }}>
              {profile.tier === 'pro' ? 'Pro' : 'Free'}
            </span>
            {profile.lifetime_pro && (
              <span style={{
                display: 'inline-flex', alignItems: 'center',
                padding: '2px 10px', borderRadius: 999,
                fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 500,
                background: 'rgba(0,196,114,0.10)',
                color: '#00c472',
              }}>
                Founding Member
              </span>
            )}
          </div>
        </Glass>
      </div>

      {/* ── Usage bar ── */}
      <Glass className="dash-stagger-card dash-card-hover" style={{ padding: 16, marginBottom: 16, animationDelay: '120ms' }}>
        <UsageBar pct={pct} resetDate={resetDate} />
      </Glass>

      {/* ── API Key ── */}
      <Glass className="dash-stagger-card dash-card-hover" style={{ padding: 16, marginBottom: 16, animationDelay: '180ms' }}>
        <p style={{ ...eyebrow, marginBottom: 12 }}>api key</p>
        <ApiKeyCard apiKey={profile.api_key} />
      </Glass>

      {/* ── Upgrade CTA (free tier only) ── */}
      {profile.tier === 'free' && (
        <Glass className="dash-stagger-card dash-card-hover" style={{ padding: 16, marginBottom: 16, animationDelay: '240ms' }}>
          <UpgradeCTA />
        </Glass>
      )}

      {/* ── Submit MCP ── */}
      <Glass className="dash-stagger-card dash-card-hover" style={{ padding: 16, marginBottom: 16, animationDelay: '240ms' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)', marginBottom: 4 }}>
              Submit an MCP server
            </p>
            <p style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
              Add your server directly to the Strata directory — no waiting for awesome-mcp-servers.
            </p>
          </div>
          <Link
            href="/submit-mcp"
            style={{
              flexShrink: 0, fontSize: 12, fontWeight: 500,
              padding: '6px 14px', borderRadius: 8, textDecoration: 'none',
              background: 'rgba(0,196,114,0.15)',
              border: '1px solid rgba(0,196,114,0.25)',
              color: '#00c472',
            }}
          >
            Submit →
          </Link>
        </div>
      </Glass>

      {/* ── Recent Requests ── */}
      <Glass className="dash-stagger-card dash-card-hover" style={{ padding: 16, animationDelay: '300ms' }}>
        <p style={{ ...eyebrow, marginBottom: 12 }}>recent requests</p>
        {requests.length === 0 ? (
          <p style={{ fontSize: 14, color: 'var(--ink-muted)' }}>
            no api calls yet — check the{' '}
            <Link href="/docs" style={{ color: 'var(--emerald-glow)' }}>docs</Link>
            {' '}to get started
          </p>
        ) : (
          <div className="dashboard-table-scroll">
            <table className="dash-table w-full" style={{ minWidth: 420 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  {['time', 'tool', 'ecosystem', 'status'].map(col => (
                    <th key={col} style={{
                      textAlign: 'left', paddingBottom: 8,
                      fontFamily: 'var(--font-mono)', fontSize: 9,
                      fontWeight: 500, letterSpacing: '0.15em',
                      textTransform: 'uppercase', color: 'var(--ink-faint)',
                    }}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {requests.map((req) => (
                  <tr key={req.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '8px 0', fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--ink-faint)', fontVariantNumeric: 'tabular-nums' }}>
                      {formatRequestTime(req.created_at)}
                    </td>
                    <td style={{ padding: '8px 8px 8px 0', fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--ink-soft)' }}>
                      {req.tool}
                    </td>
                    <td style={{ padding: '8px 8px 8px 0', fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--ink-soft)' }}>
                      {req.ecosystem}
                    </td>
                    <td style={{ padding: '8px 0' }}>
                      <span style={{
                        fontSize: 12,
                        color: req.status_code < 400 ? 'var(--emerald-glow)' : '#ef4444',
                      }}>
                        ● {req.status_code}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Glass>
    </div>
  )
}
