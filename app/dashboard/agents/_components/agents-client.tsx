'use client'

import { useState, useTransition } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AgentRow {
  id:                string
  agent_id:          string
  name:              string
  description:       string | null
  capabilities:      string[]
  created_at:        string
  expires_at:        string
  last_verified_at:  string | null
  revoked_at:        string | null
  revocation_reason: string | null
}

type AgentStatus = 'active' | 'revoked' | 'expired'

function agentStatus(a: AgentRow): AgentStatus {
  if (a.revoked_at) return 'revoked'
  if (new Date(a.expires_at) < new Date()) return 'expired'
  return 'active'
}

function relativeDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function shortAgentId(id: string): string {
  return id.slice(0, 12) + '…'
}

const STATUS_STYLES: Record<AgentStatus, string> = {
  active:  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
  revoked: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
  expired: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
}

const CAP_LABELS: Record<string, string> = {
  'mcp:invoke': 'MCP Tools',
  'x402:pay':   'x402 Pay',
}

const ALL_CAPABILITIES = ['mcp:invoke', 'x402:pay'] as const

const btnBase =
  'text-xs px-3 py-1.5 rounded-md border border-border transition-colors disabled:opacity-50'
const btnPrimary =
  `${btnBase} bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700`
const btnGhost =
  `${btnBase} bg-background hover:bg-zinc-100 dark:hover:bg-zinc-800 text-muted-foreground hover:text-foreground`
const btnDanger =
  `${btnBase} bg-background hover:bg-red-50 dark:hover:bg-red-950 text-muted-foreground hover:text-red-600`

// ── Main component ────────────────────────────────────────────────────────────

export default function AgentsClient({ initialAgents }: { initialAgents: AgentRow[] }) {
  const [agents, setAgents]       = useState<AgentRow[]>(initialAgents)
  const [showCreate, setShowCreate] = useState(false)
  const [revealJwt, setRevealJwt]   = useState<string | null>(null)
  const [revokeTarget, setRevokeTarget] = useState<AgentRow | null>(null)
  const [jwtCopied, setJwtCopied]   = useState(false)

  // Create form
  const [cName, setCName]                   = useState('')
  const [cDescription, setCDescription]     = useState('')
  const [cCapabilities, setCCapabilities]   = useState<string[]>(['mcp:invoke'])
  const [cExpires, setCExpires]             = useState(365)
  const [createError, setCreateError]       = useState<string | null>(null)
  const [isPending, startTransition]        = useTransition()
  // Captured once at mount; expiry preview is "now + N days" relative to that.
  const [mountedAt]                         = useState(() => Date.now())

  function toggleCapability(cap: string) {
    setCCapabilities(prev =>
      prev.includes(cap) ? prev.filter(c => c !== cap) : [...prev, cap]
    )
  }

  function handleCreate() {
    if (!cName.trim()) { setCreateError('Name is required'); return }
    setCreateError(null)
    startTransition(async () => {
      const res = await fetch('/api/v1/agents', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          name:            cName.trim(),
          description:     cDescription.trim() || undefined,
          capabilities:    cCapabilities,
          expires_in_days: cExpires,
        }),
      })
      const data = await res.json() as AgentRow & { credential?: string }
      if (!res.ok) {
        setCreateError((data as unknown as { error: string }).error ?? 'Creation failed')
        return
      }
      const { credential, ...row } = data
      setAgents(prev => [row, ...prev])
      setRevealJwt(credential ?? null)
      setShowCreate(false)
      setCName(''); setCDescription(''); setCCapabilities(['mcp:invoke']); setCExpires(365)
    })
  }

  function handleRevoke(agent: AgentRow) {
    startTransition(async () => {
      const res = await fetch(`/api/v1/agents/${agent.id}/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Revoked from dashboard' }),
      })
      if (res.ok) {
        const d = await res.json() as { revoked_at: string }
        setAgents(prev =>
          prev.map(a => a.id === agent.id ? { ...a, revoked_at: d.revoked_at } : a)
        )
      }
      setRevokeTarget(null)
    })
  }

  function copyJwt() {
    if (!revealJwt) return
    navigator.clipboard.writeText(revealJwt)
    setJwtCopied(true)
    setTimeout(() => setJwtCopied(false), 2000)
  }

  const CARD: React.CSSProperties = { background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(16px) saturate(1.5)', WebkitBackdropFilter: 'blur(16px) saturate(1.5)', border: '1px solid rgba(255,255,255,0.09)', borderTopColor: 'rgba(255,255,255,0.15)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 8px 32px rgba(0,0,0,0.25)', borderRadius: 12 }

  return (
    <>
      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-muted-foreground">{agents.length} identit{agents.length === 1 ? 'y' : 'ies'}</p>
        {!showCreate && (
          <button onClick={() => setShowCreate(true)} className={btnPrimary}>
            + Create Agent
          </button>
        )}
      </div>

      {/* ── Create form ──────────────────────────────────────────────────────── */}
      {showCreate && (
        <div style={{ ...CARD, padding: 24, marginBottom: 24 }}>
          <h2 className="text-sm font-medium mb-4">New Agent Identity</h2>
          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={cName}
                onChange={e => setCName(e.target.value)}
                placeholder="e.g. production-payment-bot"
                maxLength={80}
                className="w-full text-sm bg-background border border-border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              />
            </div>
            {/* Description */}
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Description <span className="text-muted-foreground">(optional)</span></label>
              <input
                type="text"
                value={cDescription}
                onChange={e => setCDescription(e.target.value)}
                placeholder="What this agent does"
                maxLength={500}
                className="w-full text-sm bg-background border border-border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              />
            </div>
            {/* Capabilities */}
            <div>
              <label className="block text-xs text-muted-foreground mb-2">Capabilities</label>
              <div className="flex gap-4">
                {ALL_CAPABILITIES.map(cap => (
                  <label key={cap} className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={cCapabilities.includes(cap)}
                      onChange={() => toggleCapability(cap)}
                      className="rounded"
                    />
                    <span className="font-mono text-xs">{cap}</span>
                    <span className="text-muted-foreground text-xs">— {CAP_LABELS[cap]}</span>
                  </label>
                ))}
              </div>
            </div>
            {/* Expires */}
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Expires in (days)</label>
              <input
                type="number"
                value={cExpires}
                onChange={e => setCExpires(Math.max(1, Math.min(1825, parseInt(e.target.value) || 365)))}
                min={1}
                max={1825}
                className="w-32 text-sm bg-background border border-border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              />
              <span className="text-xs text-muted-foreground ml-2">
                (expires {new Date(mountedAt + cExpires * 86_400_000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})
              </span>
            </div>
            {createError && (
              <p className="text-xs text-red-500">{createError}</p>
            )}
            <div className="flex gap-2 pt-1">
              <button onClick={handleCreate} disabled={isPending} className={btnPrimary}>
                {isPending ? 'Creating…' : 'Create Identity'}
              </button>
              <button onClick={() => { setShowCreate(false); setCreateError(null) }} disabled={isPending} className={btnGhost}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Empty state ──────────────────────────────────────────────────────── */}
      {agents.length === 0 && !showCreate ? (
        <div style={{ ...CARD, padding: 48, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <p className="text-base font-medium mb-2">No agent identities yet.</p>
          <p className="text-sm text-muted-foreground mb-6">
            Create an identity to issue a cryptographic credential for your agent.
          </p>
          <button onClick={() => setShowCreate(true)} className={btnPrimary}>
            Create your first agent
          </button>
        </div>
      ) : agents.length > 0 ? (
        <div style={{ ...CARD, overflowX: 'auto' }}>
          <table className="w-full text-sm">
            <thead className="text-left border-b border-border">
              <tr className="text-xs text-muted-foreground uppercase tracking-wider">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Agent ID</th>
                <th className="px-4 py-3 font-medium">Capabilities</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Expires</th>
                <th className="px-4 py-3 font-medium">Last Verified</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {agents.map(agent => {
                const status = agentStatus(agent)
                return (
                  <tr key={agent.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      <span className="font-medium text-sm">{agent.name}</span>
                      {agent.description && (
                        <span className="block text-xs text-muted-foreground">{agent.description}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground" title={agent.agent_id}>
                      {shortAgentId(agent.agent_id)}
                    </td>
                    <td className="px-4 py-3">
                      {agent.capabilities.length === 0 ? (
                        <span className="text-muted-foreground text-xs">none</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {agent.capabilities.map(cap => (
                            <span
                              key={cap}
                              className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                            >
                              {cap}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[status]}`}>
                        {status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {relativeDate(agent.expires_at)}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {agent.last_verified_at ? relativeDate(agent.last_verified_at) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {status === 'active' && (
                        <button
                          onClick={() => setRevokeTarget(agent)}
                          disabled={isPending}
                          className={btnDanger}
                        >
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      {/* ── JWT Reveal Modal ──────────────────────────────────────────────────── */}
      {revealJwt && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div
            className="rounded-xl border border-border shadow-2xl w-full max-w-lg"
            style={{
              background: 'rgba(10,13,26,0.97)',
              backdropFilter: 'blur(28px)',
            }}
          >
            <div className="p-6">
              <div className="flex items-center gap-2 mb-1">
                <span style={{
                  width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                  background: 'var(--emerald-glow)',
                  boxShadow: '0 0 8px rgba(95,176,133,0.7)',
                  display: 'inline-block',
                }} />
                <h2 className="text-sm font-semibold">Agent Credential Created</h2>
              </div>
              <div
                className="flex items-start gap-2 rounded-lg px-3 py-2 mb-4 mt-3"
                style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' }}
              >
                <span className="text-amber-400 text-sm shrink-0">⚠</span>
                <p className="text-xs text-amber-300">
                  Copy this credential now. It will <strong>not</strong> be shown again — it is
                  never stored. If you lose it, create a new identity.
                </p>
              </div>
              <div className="relative">
                <code
                  className="block font-mono text-[11px] break-all rounded-lg p-3 select-all"
                  style={{
                    background:  'var(--surface)',
                    border:      '1px solid var(--hair)',
                    color:       'var(--emerald-light)',
                    lineHeight:  1.6,
                    maxHeight:   160,
                    overflowY:   'auto',
                  }}
                >
                  {revealJwt}
                </code>
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={copyJwt}
                  className="flex-1 text-sm py-2 rounded-lg font-medium transition-colors"
                  style={{
                    background: jwtCopied ? 'rgba(45,106,79,0.6)' : 'rgba(45,106,79,0.3)',
                    border:     '1px solid var(--emerald-bright)',
                    color:      jwtCopied ? 'var(--emerald-glow)' : 'var(--ink-soft)',
                  }}
                >
                  {jwtCopied ? '✓ Copied!' : 'Copy Credential'}
                </button>
                <button
                  onClick={() => { setRevealJwt(null); setJwtCopied(false) }}
                  className="px-4 py-2 text-sm rounded-lg transition-colors"
                  style={{
                    background: 'transparent',
                    border:     '1px solid var(--hair)',
                    color:      'var(--ink-muted)',
                  }}
                >
                  Done
                </button>
              </div>
              <p className="text-xs text-center mt-3" style={{ color: 'var(--ink-faint)' }}>
                Present as: <code className="font-mono">Authorization: Bearer &lt;credential&gt;</code>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Revoke Confirmation Modal ────────────────────────────────────────── */}
      {revokeTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl border border-border">
            <p className="text-sm font-medium mb-1">Revoke <span className="font-mono">{revokeTarget.name}</span>?</p>
            <p className="text-sm text-muted-foreground mb-5">
              This immediately invalidates the credential. Any agent using it will be rejected on
              the next online verification. This cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setRevokeTarget(null)}
                disabled={isPending}
                className="text-sm px-4 py-2 border border-border rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRevoke(revokeTarget)}
                disabled={isPending}
                className="text-sm px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-60"
              >
                {isPending ? 'Revoking…' : 'Revoke'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
