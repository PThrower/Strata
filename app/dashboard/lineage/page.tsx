import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createUserClient, createServiceRoleClient } from '@/lib/supabase-server'
import { shortServerLabel } from '@/lib/lineage'
import type { LineageRiskLevel } from '@/lib/lineage'
import { RiskBadge } from '../_components/RiskBadge'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 50

type FlowRow = {
  id:                      string
  agent_id:                string | null
  session_id:              string | null
  source_server_url:       string
  source_tool:             string | null
  dest_server_url:         string
  dest_tool:               string | null
  source_capability_flags: string[] | null
  dest_capability_flags:   string[] | null
  dest_has_net_egress:     boolean
  data_tags:               string[] | null
  risk_level:              LineageRiskLevel | null
  created_at:              string
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60)         return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60)         return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24)         return `${h}h ago`
  const d = Math.floor(h / 24)
  return d < 30 ? `${d}d ago` : new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const CARD: React.CSSProperties = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: 12,
}

function TagChips({ tags }: { tags: string[] | null }) {
  if (!tags || tags.length === 0) return <span style={{ color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>—</span>
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
      {tags.map((t) => (
        <span
          key={t}
          style={{ display: 'inline-flex', alignItems: 'center', padding: '1px 6px', borderRadius: 4, fontSize: 10, fontFamily: 'var(--font-mono)', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.55)' }}
        >
          {t}
        </span>
      ))}
    </div>
  )
}

// Derive an ordered list of distinct hostnames from the session flows for the chain header.
function buildSessionChain(flows: FlowRow[]): string[] {
  const sorted = [...flows].sort((a, b) => a.created_at.localeCompare(b.created_at))
  const seen = new Set<string>()
  const chain: string[] = []
  for (const f of sorted) {
    for (const url of [f.source_server_url, f.dest_server_url]) {
      try {
        const h = new URL(url).hostname
        if (!seen.has(h)) { seen.add(h); chain.push(h) }
      } catch { /* skip invalid URLs */ }
    }
  }
  return chain
}

export default async function LineagePage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string; egress?: string; page?: string }>
}) {
  const params = await searchParams
  const sessionFilter = params.session ?? null
  const egressOnly    = params.egress === '1'
  const page          = Math.max(1, parseInt(params.page ?? '1', 10) || 1)

  const userClient = await createUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) redirect('/login')

  const sb   = createServiceRoleClient()
  const from = (page - 1) * PAGE_SIZE
  const to   = from + PAGE_SIZE - 1

  let query = sb
    .from('data_lineage_flows')
    .select(
      'id, agent_id, session_id, source_server_url, source_tool, dest_server_url, dest_tool, ' +
      'source_capability_flags, dest_capability_flags, dest_has_net_egress, ' +
      'data_tags, risk_level, created_at',
      { count: 'exact' },
    )
    .eq('profile_id', user.id)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (sessionFilter) query = query.eq('session_id', sessionFilter)
  if (egressOnly)    query = query.eq('dest_has_net_egress', true)

  const { data, count } = await query
  const flows      = (data ?? []) as unknown as FlowRow[]
  const total      = count ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  // Count net-egress flows in last 7 days for the risk banner.
  // eslint-disable-next-line react-hooks/purity
  const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString()
  const { count: egressCount } = await sb
    .from('data_lineage_flows')
    .select('id', { count: 'exact', head: true })
    .eq('profile_id', user.id)
    .eq('dest_has_net_egress', true)
    .gte('created_at', sevenDaysAgo)

  const sessionChain = sessionFilter && flows.length > 0 ? buildSessionChain(flows) : null

  // Build current-filter href helpers for pagination links.
  function pageHref(p: number): string {
    const sp = new URLSearchParams()
    if (sessionFilter) sp.set('session', sessionFilter)
    if (egressOnly)    sp.set('egress', '1')
    if (p > 1)         sp.set('page', String(p))
    const q = sp.toString()
    return `/dashboard/lineage${q ? '?' + q : ''}`
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-semibold mb-1">Data Lineage</h1>
        <p className="text-sm text-muted-foreground">
          Track where your agent&apos;s data traveled and which servers had access to it.
        </p>
      </div>

      {/* ── Risk banner ────────────────────────────────────────────────────── */}
      {(egressCount ?? 0) > 0 && !egressOnly && !sessionFilter && (
        <div
          className="rounded-lg px-4 py-3 mb-5 flex items-center justify-between gap-4"
          style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' }}
        >
          <div className="flex items-center gap-2">
            <span className="text-amber-400">⚠</span>
            <p className="text-sm text-amber-300">
              <strong>{egressCount}</strong> flow{egressCount === 1 ? '' : 's'} sent data to
              net_egress-capable servers in the last 7 days.
            </p>
          </div>
          <Link
            href="/dashboard/lineage?egress=1"
            className="text-xs px-3 py-1.5 rounded-md shrink-0"
            style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.4)', color: '#fbbf24' }}
          >
            View all →
          </Link>
        </div>
      )}

      {/* ── Filter bar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-4 text-sm">
        <Link
          href="/dashboard/lineage"
          className={`px-3 py-1.5 rounded-md border transition-colors ${!egressOnly && !sessionFilter ? 'border-border bg-zinc-100 dark:bg-zinc-800 font-medium' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          All flows
        </Link>
        <Link
          href="/dashboard/lineage?egress=1"
          className={`px-3 py-1.5 rounded-md border transition-colors ${egressOnly ? 'border-amber-400/50 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 font-medium' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          ⚠ Egress risks only
        </Link>
        {sessionFilter && (
          <span className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-border bg-zinc-100 dark:bg-zinc-800 font-medium font-mono text-xs">
            Session: {sessionFilter.length > 24 ? sessionFilter.slice(0, 24) + '…' : sessionFilter}
            <Link href="/dashboard/lineage" className="text-muted-foreground hover:text-foreground">✕</Link>
          </span>
        )}
        <span className="text-muted-foreground text-xs ml-auto">{total} flow{total === 1 ? '' : 's'}</span>
      </div>

      {/* ── Session chain ─────────────────────────────────────────────────── */}
      {sessionChain && sessionChain.length > 1 && (
        <div style={{ ...CARD, padding: '12px 16px', marginBottom: 16 }}>
          <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider font-medium">Session traversal</p>
          <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs">
            {sessionChain.map((h, i) => (
              <span key={h} className="flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-foreground">{h}</span>
                {i < sessionChain.length - 1 && <span className="text-muted-foreground">→</span>}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Empty state ────────────────────────────────────────────────────── */}
      {flows.length === 0 ? (
        <div style={{ ...CARD, padding: 48, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <p className="text-base font-medium mb-2">
            {egressOnly ? 'No net-egress flows found.' : sessionFilter ? 'No flows in this session.' : 'No lineage recorded yet.'}
          </p>
          {!egressOnly && !sessionFilter && (
            <>
              <p className="text-sm text-muted-foreground mb-2">
                Record flows from your agent via the API or MCP tool:
              </p>
              <code className="font-mono text-xs bg-zinc-100 dark:bg-zinc-800 px-3 py-2 rounded mb-6 text-left max-w-lg w-full">
                POST /api/v1/lineage<br />
                {'{ "source_server": "https://...", "dest_server": "https://..." }'}
              </code>
              <Link href="/docs" className="text-sm" style={{ color: '#00c472' }}>
                API reference →
              </Link>
            </>
          )}
        </div>
      ) : (
        <>
          <div style={{ ...CARD, overflowX: 'auto' }}>
            <table className="w-full text-sm">
              <thead style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <tr style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 500, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>
                  <th className="px-4 py-3 font-medium">Time</th>
                  <th className="px-4 py-3 font-medium">Flow</th>
                  <th className="px-4 py-3 font-medium">Session</th>
                  <th className="px-4 py-3 font-medium">Data Tags</th>
                  <th className="px-4 py-3 font-medium">Risk</th>
                  <th className="px-4 py-3 font-medium text-center">Egress</th>
                </tr>
              </thead>
              <tbody>
                {flows.map((f) => (
                  <tr key={f.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap text-xs" title={f.created_at}>
                      {relativeTime(f.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 font-mono text-xs">
                        <span className="text-foreground">{shortServerLabel(f.source_server_url)}</span>
                        {f.source_tool && (
                          <span className="text-muted-foreground text-[10px]">({f.source_tool})</span>
                        )}
                        <span className="text-muted-foreground">→</span>
                        <span className={f.dest_has_net_egress ? 'text-amber-500 dark:text-amber-400' : 'text-foreground'}>
                          {shortServerLabel(f.dest_server_url)}
                        </span>
                        {f.dest_tool && (
                          <span className="text-muted-foreground text-[10px]">({f.dest_tool})</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {f.session_id ? (
                        <Link
                          href={`/dashboard/lineage?session=${encodeURIComponent(f.session_id)}`}
                          className="font-mono text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
                          title={f.session_id}
                        >
                          {f.session_id.length > 16 ? f.session_id.slice(0, 16) + '…' : f.session_id}
                        </Link>
                      ) : (
                        <span className="text-zinc-500">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <TagChips tags={f.data_tags} />
                    </td>
                    <td className="px-4 py-3">
                      <RiskBadge level={f.risk_level} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      {f.dest_has_net_egress ? (
                        <span
                          title="Destination has net_egress capability"
                          style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 6px rgba(239,68,68,0.6)' }}
                        />
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4 text-xs text-muted-foreground">
            <span>
              Showing {from + 1}–{Math.min(from + flows.length, total)} of {total}
            </span>
            <div className="flex gap-2">
              {page > 1 && (
                <Link href={pageHref(page - 1)} className="px-3 py-1.5 rounded-md border border-border hover:bg-zinc-50 dark:hover:bg-zinc-800">
                  ← Prev
                </Link>
              )}
              <span className="px-3 py-1.5">Page {page} of {totalPages}</span>
              {page < totalPages && (
                <Link href={pageHref(page + 1)} className="px-3 py-1.5 rounded-md border border-border hover:bg-zinc-50 dark:hover:bg-zinc-800">
                  Next →
                </Link>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
