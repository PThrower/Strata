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

const STATUS_INLINE: Record<AgentStatus, React.CSSProperties> = {
  active:  { color: '#00c472', background: 'rgba(0,196,114,0.10)',   border: '1px solid rgba(0,196,114,0.32)' },
  revoked: { color: '#ff7a45', background: 'rgba(255,122,69,0.10)',  border: '1px solid rgba(255,122,69,0.32)' },
  expired: { color: '#888888', background: 'rgba(136,136,136,0.10)', border: '1px solid rgba(136,136,136,0.30)' },
}

const BADGE_BASE: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', padding: '3px 9px',
  borderRadius: '999px', fontFamily: 'var(--font-mono)',
  fontSize: '10.5px', fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase',
}

const CAP_LABELS: Record<string, string> = {
  'mcp:invoke': 'MCP Tools',
  'x402:pay':   'x402 Pay',
}

const ALL_CAPABILITIES = ['mcp:invoke', 'x402:pay'] as const

const BTN_PRIMARY: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: '8px',
  padding: '8px 16px', borderRadius: '999px',
  fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 500,
  cursor: 'pointer', border: '1px solid rgba(0,196,114,0.50)',
  background: 'rgba(0,196,114,0.15)', color: '#00c472',
  transition: 'opacity 150ms',
}
const BTN_GHOST: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: '8px',
  padding: '8px 16px', borderRadius: '999px',
  fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 500,
  cursor: 'pointer', border: '1px solid rgba(255,255,255,0.14)',
  background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.65)',
  transition: 'opacity 150ms',
}
const BTN_DANGER: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: '8px',
  padding: '8px 16px', borderRadius: '999px',
  fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 500,
  cursor: 'pointer', border: '1px solid rgba(255,122,69,0.32)',
  background: 'rgba(255,122,69,0.08)', color: '#ff7a45',
  transition: 'opacity 150ms',
}

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

  const CARD: React.CSSProperties = { background: 'linear-gradient(135deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 35%, rgba(255,255,255,0.02) 70%, rgba(0,196,114,0.05) 100%)', backdropFilter: 'blur(28px) saturate(180%)', WebkitBackdropFilter: 'blur(28px) saturate(180%)', border: '1px solid rgba(255,255,255,0.10)', borderTopColor: 'rgba(255,255,255,0.28)', borderLeftColor: 'rgba(255,255,255,0.20)', borderRadius: '22px', boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.30), inset 1px 0 0 0 rgba(255,255,255,0.14), inset 0 -1px 0 0 rgba(0,0,0,0.30), inset 0 0 36px 0 rgba(0,196,114,0.04), 0 24px 60px -24px rgba(0,0,0,0.7), 0 4px 14px -4px rgba(0,0,0,0.4)' }

  return (
    <>
      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-muted-foreground">{agents.length} identit{agents.length === 1 ? 'y' : 'ies'}</p>
        {!showCreate && (
          <button onClick={() => setShowCreate(true)} style={BTN_PRIMARY}>
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
              <button onClick={handleCreate} disabled={isPending} style={BTN_PRIMARY}>
                {isPending ? 'Creating…' : 'Create Identity'}
              </button>
              <button onClick={() => { setShowCreate(false); setCreateError(null) }} disabled={isPending} style={BTN_GHOST}>
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
          <button onClick={() => setShowCreate(true)} style={BTN_PRIMARY}>
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
                              style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', padding: '2px 7px', borderRadius: '6px', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.75)', border: '1px solid rgba(255,255,255,0.12)' }}
                            >
                              {cap}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span style={{ ...BADGE_BASE, ...STATUS_INLINE[status] }}>
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
                          style={BTN_DANGER}
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
          <div style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 35%, rgba(0,196,114,0.05) 100%)', backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)', border: '1px solid rgba(255,255,255,0.16)', borderRadius: '22px', padding: '24px', maxWidth: 380, width: '100%', margin: '0 16px' }}>
            <p className="text-sm font-medium mb-1">Revoke <span className="font-mono">{revokeTarget.name}</span>?</p>
            <p className="text-sm text-muted-foreground mb-5">
              This immediately invalidates the credential. Any agent using it will be rejected on
              the next online verification. This cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setRevokeTarget(null)}
                disabled={isPending}
                style={BTN_GHOST}
              >
                Cancel
              </button>
              <button
                onClick={() => handleRevoke(revokeTarget)}
                disabled={isPending}
                style={BTN_DANGER}
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
