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
  const styles: Record<string, string> = {
    approved:   'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
    flagged:    'bg-amber-100  text-amber-700  dark:bg-amber-900/40  dark:text-amber-400',
    rejected:   'bg-red-100    text-red-700    dark:bg-red-900/40    dark:text-red-400',
    pending:    'bg-zinc-100   text-zinc-600   dark:bg-zinc-800      dark:text-zinc-400',
    validating: 'bg-zinc-100   text-zinc-600   dark:bg-zinc-800      dark:text-zinc-400',
  }
  const labels: Record<string, string> = {
    approved: 'Published', flagged: 'Under Review',
    rejected: 'Not Published', pending: 'Processing', validating: 'Processing',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] ?? styles.pending}`}>
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

  const CARD = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12 }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-serif text-2xl font-semibold">My Submissions</h1>
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
      <tr className="border-b border-border last:border-0 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
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
