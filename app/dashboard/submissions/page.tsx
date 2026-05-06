import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createUserClient, createServiceRoleClient } from '@/lib/supabase-server'

type Submission = {
  id: string
  ecosystem_slug: string
  category: string
  title: string
  body: string
  source_url: string | null
  status: string
  claude_reasoning: string | null
  submitted_at: string
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function StatusBadge({ status }: { status: string }) {
  const INLINE: Record<string, React.CSSProperties> = {
    approved:   { color: '#00c472', background: 'rgba(0,196,114,0.10)',   borderColor: 'rgba(0,196,114,0.32)' },
    flagged:    { color: '#f5b042', background: 'rgba(245,176,66,0.10)',  borderColor: 'rgba(245,176,66,0.32)' },
    rejected:   { color: '#ff7a45', background: 'rgba(255,122,69,0.10)',  borderColor: 'rgba(255,122,69,0.32)' },
    pending:    { color: '#888888', background: 'rgba(136,136,136,0.10)', borderColor: 'rgba(136,136,136,0.30)' },
    validating: { color: '#888888', background: 'rgba(136,136,136,0.10)', borderColor: 'rgba(136,136,136,0.30)' },
  }
  const labels: Record<string, string> = {
    approved: 'Published', flagged: 'Under Review',
    rejected: 'Not Published', pending: 'Processing', validating: 'Processing',
  }
  const s = INLINE[status] ?? INLINE.pending
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: '3px 9px',
      borderRadius: '999px', fontFamily: 'var(--font-mono)',
      fontSize: '10.5px', fontWeight: 500, letterSpacing: '0.14em',
      textTransform: 'uppercase', border: '1px solid', ...s,
    }}>
      {labels[status] ?? status}
    </span>
  )
}

export default async function SubmissionsPage() {
  const userClient = await createUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) redirect('/login')

  const serviceClient = createServiceRoleClient()
  const { data: rows } = await serviceClient
    .from('submissions')
    .select('id, ecosystem_slug, category, title, body, source_url, status, claude_reasoning, submitted_at')
    .eq('user_id', user.id)
    .order('submitted_at', { ascending: false })

  const submissions = (rows ?? []) as Submission[]

  const CARD: React.CSSProperties = { background: 'linear-gradient(135deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 35%, rgba(255,255,255,0.02) 70%, rgba(0,196,114,0.05) 100%)', backdropFilter: 'blur(28px) saturate(180%)', WebkitBackdropFilter: 'blur(28px) saturate(180%)', border: '1px solid rgba(255,255,255,0.10)', borderTopColor: 'rgba(255,255,255,0.28)', borderLeftColor: 'rgba(255,255,255,0.20)', borderRadius: '22px', boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.30), inset 1px 0 0 0 rgba(255,255,255,0.14), inset 0 -1px 0 0 rgba(0,0,0,0.30), inset 0 0 36px 0 rgba(0,196,114,0.04), 0 24px 60px -24px rgba(0,0,0,0.7), 0 4px 14px -4px rgba(0,0,0,0.4)' }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <div className="flex items-center justify-between mb-8">
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '44px', fontWeight: 400, letterSpacing: '-0.022em', color: '#ffffff', margin: 0 }}>My Submissions</h1>
        <Link
          href="/dashboard/submit"
          className="text-sm px-4 py-2 rounded-md font-medium transition-colors"
          style={{ background: '#00c472', color: 'white' }}
        >
          Submit content
        </Link>
      </div>

      {submissions.length === 0 ? (
        <div style={{ ...CARD, padding: 48, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <p className="text-base font-medium mb-2">You haven&apos;t submitted any content yet.</p>
          <p className="text-sm text-muted-foreground mb-6">
            Share an integration, tip, or news item with the community.
          </p>
          <Link href="/dashboard/submit" className="text-sm" style={{ color: '#00c472' }}>
            Submit content →
          </Link>
        </div>
      ) : (
        <div style={{ ...CARD, overflowX: 'auto' }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="text-left px-4 py-3 font-medium">Date</th>
                <th className="text-left px-4 py-3 font-medium">Ecosystem</th>
                <th className="text-left px-4 py-3 font-medium">Category</th>
                <th className="text-left px-4 py-3 font-medium">Title</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map(sub => (
                <SubmissionRow key={sub.id} sub={sub} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function SubmissionRow({ sub }: { sub: Submission }) {
  const catLabel: Record<string, string> = {
    best_practices: 'Best Practice',
    integrations: 'Integration',
    news: 'News',
  }

  return (
    <>
      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <td className="px-4 py-3 text-xs text-muted-foreground tabular-nums whitespace-nowrap">
          {formatDate(sub.submitted_at)}
        </td>
        <td className="px-4 py-3">
          <span className="font-mono text-xs">{sub.ecosystem_slug}</span>
        </td>
        <td className="px-4 py-3 text-xs text-muted-foreground">
          {catLabel[sub.category] ?? sub.category}
        </td>
        <td className="px-4 py-3 max-w-[240px]">
          <p className="truncate text-sm">{sub.title}</p>
          {sub.claude_reasoning && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{sub.claude_reasoning}</p>
          )}
        </td>
        <td className="px-4 py-3">
          <StatusBadge status={sub.status} />
        </td>
      </tr>
    </>
  )
}
