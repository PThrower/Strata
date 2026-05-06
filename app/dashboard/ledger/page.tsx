import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createUserClient, createServiceRoleClient } from '@/lib/supabase-server'
import type { RiskLevel } from '@/lib/risk'
import { RiskBadge } from '../_components/RiskBadge'

const PAGE_SIZE = 25

type LedgerRow = {
  id: string
  tool_called: string
  server_url: string | null
  risk_level: RiskLevel | null
  capability_flags: string[] | null
  duration_ms: number | null
  agent_id: string | null
  created_at: string
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
  if (d < 30)         return `${d}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function shortServer(url: string | null): string {
  if (!url) return '—'
  try {
    const u = new URL(url)
    if (u.hostname === 'github.com') {
      const segs = u.pathname.split('/').filter(Boolean)
      if (segs.length >= 2) return `${segs[0]}/${segs[1]}`.replace(/\.git$/, '')
    }
    return u.hostname + u.pathname
  } catch {
    return url.length > 50 ? url.slice(0, 47) + '…' : url
  }
}

function FlagChips({ flags }: { flags: string[] | null }) {
  if (!flags || flags.length === 0) return <span style={{ color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>—</span>
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
      {flags.map((f) => (
        <span
          key={f}
          style={{ display: 'inline-flex', alignItems: 'center', padding: '1px 6px', borderRadius: 4, fontSize: 10, fontFamily: 'var(--font-mono)', background: 'rgba(255,255,255,0.06)', color: 'var(--ink-muted)' }}
        >
          {f}
        </span>
      ))}
    </div>
  )
}

const CARD: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--hair)',
  borderRadius: 12,
}

export default async function LedgerPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const params = await searchParams
  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1)

  const userClient = await createUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) redirect('/login')

  const sb = createServiceRoleClient()
  const from = (page - 1) * PAGE_SIZE
  const to   = from + PAGE_SIZE - 1

  const { data, count } = await sb
    .from('agent_activity_ledger')
    .select(
      'id, tool_called, server_url, risk_level, capability_flags, duration_ms, agent_id, created_at',
      { count: 'exact' },
    )
    .eq('profile_id', user.id)
    .order('created_at', { ascending: false })
    .range(from, to)

  const rows = (data ?? []) as LedgerRow[]
  const total = count ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-serif text-2xl font-semibold mb-1">Activity Ledger</h1>
          <p className="text-sm text-muted-foreground">
            Append-only, cryptographically-signed record of every API call. Foundation for SOC 2 audit.
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0 mt-1">
          <a
            href="/api/compliance/report?format=json&period=90d&standard=soc2"
            download
            className="text-xs px-3 py-1.5 rounded-md border border-border bg-background hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-muted-foreground hover:text-foreground"
          >
            Export SOC 2 (JSON)
          </a>
          <a
            href="/api/compliance/report?format=csv&period=90d"
            download
            className="text-xs px-3 py-1.5 rounded-md border border-border bg-background hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-muted-foreground hover:text-foreground"
          >
            Export CSV
          </a>
        </div>
      </div>

      {rows.length === 0 ? (
        <div style={{ ...CARD, padding: 48, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <p className="text-base font-medium mb-2">No activity logged yet.</p>
          <p className="text-sm text-muted-foreground mb-6">
            Make your first API call to see it here.
          </p>
          <Link href="/docs#mcp-server" className="text-sm" style={{ color: '#00c472' }}>
            Connect via MCP →
          </Link>
        </div>
      ) : (
        <>
          <div style={{ ...CARD, overflowX: 'auto' }}>
            <table className="w-full text-sm">
              <thead style={{ borderBottom: '1px solid var(--hair)' }}>
                <tr style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 500, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--ink-faint)' }}>
                  <th className="px-4 py-3 font-medium">Time</th>
                  <th className="px-4 py-3 font-medium">Tool</th>
                  <th className="px-4 py-3 font-medium">Server</th>
                  <th className="px-4 py-3 font-medium">Risk</th>
                  <th className="px-4 py-3 font-medium">Flags</th>
                  <th className="px-4 py-3 font-medium text-right">Duration</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} style={{ borderBottom: '1px solid var(--hair)' }}>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap" title={r.created_at}>
                      {relativeTime(r.created_at)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">{r.tool_called}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{shortServer(r.server_url)}</td>
                    <td className="px-4 py-3"><RiskBadge level={r.risk_level} /></td>
                    <td className="px-4 py-3"><FlagChips flags={r.capability_flags} /></td>
                    <td className="px-4 py-3 font-mono text-xs text-right text-muted-foreground whitespace-nowrap">
                      {r.duration_ms == null ? '—' : `${r.duration_ms}ms`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between mt-4 text-xs text-muted-foreground">
            <span>
              Showing {from + 1}–{Math.min(from + rows.length, total)} of {total}
            </span>
            <div className="flex gap-2">
              {page > 1 && (
                <Link
                  href={`/dashboard/ledger?page=${page - 1}`}
                  className="px-3 py-1.5 rounded-md border border-border hover:bg-zinc-50 dark:hover:bg-zinc-800"
                >
                  ← Prev
                </Link>
              )}
              <span className="px-3 py-1.5">
                Page {page} of {totalPages}
              </span>
              {page < totalPages && (
                <Link
                  href={`/dashboard/ledger?page=${page + 1}`}
                  className="px-3 py-1.5 rounded-md border border-border hover:bg-zinc-50 dark:hover:bg-zinc-800"
                >
                  Next →
                </Link>
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Exported reports cover 90 days and include tamper-evidence verification. Use the Export buttons above.
          </p>
        </>
      )}
    </div>
  )
}
