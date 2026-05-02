import { redirect, notFound } from 'next/navigation'
import { createUserClient, createServiceRoleClient } from '@/lib/supabase-server'
import AdminActions from './AdminActions'
import McpAdminActions from './McpAdminActions'

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
  user_id: string
}

type McpSubmission = {
  id: string
  name: string
  url: string | null
  description: string | null
  category: string | null
  security_score: number | null
  injection_risk_score: number | null
  submitter_email: string | null
  created_at: string
}

type Profile = {
  id: string
  email: string
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const catLabel: Record<string, string> = {
  best_practices: 'Best Practice',
  integrations: 'Integration',
  news: 'News',
}

export default async function AdminPage() {
  const userClient = await createUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) redirect('/login')
  const adminEmail = process.env.ADMIN_EMAIL
  if (!adminEmail || user.email !== adminEmail) notFound()

  const serviceClient = createServiceRoleClient()

  const { data: flaggedRows } = await serviceClient
    .from('submissions')
    .select('id, ecosystem_slug, category, title, body, source_url, status, claude_reasoning, submitted_at, user_id')
    .eq('status', 'flagged')
    .order('submitted_at', { ascending: false })

  const { data: recentRows } = await serviceClient
    .from('submissions')
    .select('id, ecosystem_slug, category, title, body, source_url, status, claude_reasoning, submitted_at, user_id')
    .in('status', ['approved', 'rejected'])
    .order('submitted_at', { ascending: false })
    .limit(20)

  const { data: pendingMcpRows } = await serviceClient
    .from('mcp_servers')
    .select('id, name, url, description, category, security_score, injection_risk_score, submitter_email, created_at')
    .eq('score_status', 'pending_review')
    .order('created_at', { ascending: false })

  const { data: suggestionRows } = await serviceClient
    .from('suggestions')
    .select('id, content, submitted_at, user_id')
    .order('submitted_at', { ascending: false })

  const flagged = (flaggedRows ?? []) as Submission[]
  const recent  = (recentRows  ?? []) as Submission[]
  const pendingMcp = (pendingMcpRows ?? []) as McpSubmission[]
  const suggestions = (suggestionRows ?? []) as { id: string; content: string; submitted_at: string; user_id: string }[]

  const allUserIds = [...new Set([
    ...flagged.map(s => s.user_id),
    ...recent.map(s => s.user_id),
    ...suggestions.map(s => s.user_id),
  ])]
  const { data: profileRows } = await serviceClient
    .from('profiles')
    .select('id, email')
    .in('id', allUserIds.length > 0 ? allUserIds : ['00000000-0000-0000-0000-000000000000'])

  const profileMap = Object.fromEntries(
    ((profileRows ?? []) as Profile[]).map(p => [p.id, p.email])
  )

  const card = 'bg-white dark:bg-zinc-900 rounded-lg border border-border'

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div className="mb-8">
        <p className="text-xs font-mono text-muted-foreground mb-1 uppercase tracking-widest">admin</p>
        <h1 className="font-serif text-2xl font-semibold">Submissions</h1>
      </div>

      {/* Flagged section */}
      <section className="mb-10">
        <h2 className="text-sm font-semibold mb-4">
          Flagged — needs review
          {flagged.length > 0 && (
            <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 font-normal">
              {flagged.length}
            </span>
          )}
        </h2>

        {flagged.length === 0 ? (
          <div className={`${card} p-6 text-sm text-muted-foreground`}>
            No submissions flagged for review.
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {flagged.map(sub => (
              <div key={sub.id} className={`${card} p-5`}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-muted-foreground">
                    {sub.ecosystem_slug}
                  </span>
                  <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-muted-foreground">
                    {catLabel[sub.category] ?? sub.category}
                  </span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {formatDate(sub.submitted_at)} · {profileMap[sub.user_id] ?? sub.user_id}
                  </span>
                </div>

                <p className="font-medium text-sm mb-1">{sub.title}</p>
                <p className="text-sm text-muted-foreground mb-3 leading-relaxed">{sub.body}</p>

                {sub.source_url && (
                  <p className="text-xs text-muted-foreground mb-3">
                    Source:{' '}
                    <a href={sub.source_url} target="_blank" rel="noopener noreferrer" style={{ color: '#00c472' }}>
                      {sub.source_url}
                    </a>
                  </p>
                )}

                {sub.claude_reasoning && (
                  <div className="rounded-md px-3 py-2 mb-4 text-xs bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
                    {sub.claude_reasoning}
                  </div>
                )}

                <AdminActions id={sub.id} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Recent approved/rejected */}
      <section>
        <h2 className="text-sm font-semibold mb-4">Recent decisions</h2>
        {recent.length === 0 ? (
          <div className={`${card} p-6 text-sm text-muted-foreground`}>No recent decisions.</div>
        ) : (
          <div className={card}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="text-left px-4 py-3 font-medium">Date</th>
                  <th className="text-left px-4 py-3 font-medium">Ecosystem</th>
                  <th className="text-left px-4 py-3 font-medium">Title</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium">User</th>
                </tr>
              </thead>
              <tbody>
                {recent.map(sub => (
                  <tr key={sub.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(sub.submitted_at)}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="font-mono text-xs">{sub.ecosystem_slug}</span>
                    </td>
                    <td className="px-4 py-2.5 max-w-[200px]">
                      <p className="truncate text-sm">{sub.title}</p>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs font-medium ${sub.status === 'approved' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                        {sub.status === 'approved' ? 'Published' : 'Rejected'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground truncate max-w-[140px]">
                      {profileMap[sub.user_id] ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Pending MCP Submissions */}
      <section className="mt-10">
        <h2 className="text-sm font-semibold mb-4">
          Pending MCP Submissions
          {pendingMcp.length > 0 && (
            <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 font-normal">
              {pendingMcp.length}
            </span>
          )}
        </h2>

        {pendingMcp.length === 0 ? (
          <div className={`${card} p-6 text-sm text-muted-foreground`}>
            No pending MCP server submissions.
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {pendingMcp.map(server => (
              <div key={server.id} className={`${card} p-5`}>
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  {server.category && (
                    <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-muted-foreground">
                      {server.category}
                    </span>
                  )}
                  {server.security_score !== null && (
                    <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                      score {server.security_score}/100
                    </span>
                  )}
                  {server.injection_risk_score !== null && server.injection_risk_score >= 3 && (
                    <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                      L1 injection {server.injection_risk_score}/10
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground ml-auto">
                    {formatDate(server.created_at)}
                    {server.submitter_email && ` · ${server.submitter_email}`}
                  </span>
                </div>

                <p className="font-medium text-sm mb-1">{server.name}</p>
                {server.description && (
                  <p className="text-sm text-muted-foreground mb-2 leading-relaxed">{server.description}</p>
                )}
                {server.url && (
                  <p className="text-xs text-muted-foreground mb-3">
                    <a href={server.url} target="_blank" rel="noopener noreferrer" style={{ color: '#00c472' }}>
                      {server.url}
                    </a>
                  </p>
                )}

                <McpAdminActions id={server.id} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Suggestion Jar */}
      <section className="mt-10">
        <h2 className="text-sm font-semibold mb-4">
          Suggestion Jar
          {suggestions.length > 0 && (
            <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 font-normal">
              {suggestions.length}
            </span>
          )}
        </h2>
        {suggestions.length === 0 ? (
          <div className={`${card} p-6 text-sm text-muted-foreground`}>No suggestions yet.</div>
        ) : (
          <div className="flex flex-col gap-3">
            {suggestions.map(s => (
              <div key={s.id} className={`${card} p-4`}>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xs text-muted-foreground">
                    {formatDate(s.submitted_at)}
                  </span>
                  <span className="text-xs text-muted-foreground">·</span>
                  <span className="text-xs text-muted-foreground">{profileMap[s.user_id] ?? s.user_id}</span>
                </div>
                <p className="text-sm leading-relaxed">{s.content}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
