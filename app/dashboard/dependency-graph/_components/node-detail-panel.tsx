'use client'

import Link from 'next/link'
import type { GraphNode, GraphEdge } from '@/lib/dependency-graph'

interface Props {
  node:  GraphNode
  edges: GraphEdge[]
  onClose: () => void
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60)   return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60)   return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24)   return `${h}h ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const SEV_COLOR: Record<string, string> = {
  critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#6b7280',
}

const RISK_COLOR: Record<string, string> = {
  critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#22c55e', unknown: '#6b7280',
}

const FLAG_DANGER = new Set(['shell_exec', 'dynamic_eval', 'arbitrary_sql'])
const FLAG_WARN   = new Set(['fs_write', 'secret_read', 'process_spawn'])

export default function NodeDetailPanel({ node, edges, onClose }: Props) {
  const inFlows  = edges.filter(e => e.dest_url   === node.url)
  const outFlows = edges.filter(e => e.source_url === node.url)

  const card = 'bg-white dark:bg-zinc-900 rounded-lg border border-border'

  return (
    <div
      className={`${card} p-4`}
      style={{ width: 320, flexShrink: 0, maxHeight: 580, overflowY: 'auto' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <p className="font-medium text-sm truncate" title={node.name}>{node.name}</p>
          {node.url && (
            <a
              href={node.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xs text-muted-foreground hover:text-foreground transition-colors block truncate"
              title={node.url}
            >
              {node.url}
            </a>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground text-lg leading-none flex-shrink-0"
          aria-label="Close"
        >
          ×
        </button>
      </div>

      {/* Risk + scores */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span
          className="text-xs px-2 py-0.5 rounded-full font-medium"
          style={{ background: `${RISK_COLOR[node.risk_level] ?? '#6b7280'}20`, color: RISK_COLOR[node.risk_level] ?? '#6b7280', border: `1px solid ${RISK_COLOR[node.risk_level] ?? '#6b7280'}40` }}
        >
          {node.risk_level}
        </span>
        {node.security_score !== null && (
          <span className="text-xs text-muted-foreground font-mono">sec {node.security_score}</span>
        )}
        {node.runtime_score !== null && (
          <span className="text-xs text-muted-foreground font-mono">rt {node.runtime_score}</span>
        )}
        {!node.in_directory && (
          <span className="text-xs text-muted-foreground italic">not in directory</span>
        )}
      </div>

      {/* Circuit breaker */}
      {node.circuit_broken && (
        <div className="rounded-md px-3 py-2 mb-3 text-xs" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
          <p className="font-semibold text-red-500 mb-0.5">⚡ Circuit breaker tripped</p>
          {node.circuit_broken_reason && (
            <p className="text-muted-foreground leading-snug">{node.circuit_broken_reason}</p>
          )}
          {node.has_profile_reset && (
            <p className="text-emerald-500 mt-1 text-[11px]">✓ You have a personal reset active</p>
          )}
          <Link
            href="/dashboard/circuit-breakers"
            className="inline-block mt-1.5 text-red-400 hover:text-red-300 underline-offset-2 hover:underline"
          >
            Manage circuit breakers →
          </Link>
        </div>
      )}

      {/* Quarantined */}
      {node.is_quarantined && (
        <div className="rounded-md px-3 py-2 mb-3 text-xs" style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.25)' }}>
          <p className="font-semibold text-orange-400">⛔ Quarantined — prompt injection detected</p>
        </div>
      )}

      {/* Policy blocked */}
      {node.policy_blocked && (
        <div className="rounded-md px-3 py-2 mb-3 text-xs" style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.25)' }}>
          <p className="font-semibold" style={{ color: '#8b5cf6' }}>Active policy would block this server</p>
          <Link href="/dashboard/policies" className="text-[11px] text-purple-400 hover:text-purple-300 underline-offset-2 hover:underline mt-0.5 inline-block">
            View policies →
          </Link>
        </div>
      )}

      {/* Capability flags */}
      {node.capability_flags.length > 0 && (
        <div className="mb-3">
          <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1.5">Capability flags</p>
          <div className="flex flex-wrap gap-1">
            {node.capability_flags.map(f => (
              <span
                key={f}
                className="font-mono text-[10px] px-1.5 py-0.5 rounded"
                style={{
                  background: FLAG_DANGER.has(f) ? 'rgba(239,68,68,0.15)' : FLAG_WARN.has(f) ? 'rgba(234,179,8,0.15)' : 'rgba(255,255,255,0.06)',
                  color:       FLAG_DANGER.has(f) ? '#ef4444'              : FLAG_WARN.has(f) ? '#eab308'              : 'rgba(255,255,255,0.55)',
                }}
              >
                {f}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Data flows */}
      {(inFlows.length > 0 || outFlows.length > 0) && (
        <div className="mb-3">
          <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1.5">Data flows</p>
          {outFlows.map((e, i) => (
            <div key={`out-${i}`} className="text-xs text-muted-foreground mb-0.5 truncate">
              → <span className="font-mono">{safeHostname(e.dest_url)}</span>
              <span className="ml-1 opacity-60">({e.flow_count} flow{e.flow_count !== 1 ? 's' : ''}{e.dest_has_net_egress ? ' · net_egress' : ''})</span>
            </div>
          ))}
          {inFlows.map((e, i) => (
            <div key={`in-${i}`} className="text-xs text-muted-foreground mb-0.5 truncate">
              ← <span className="font-mono">{safeHostname(e.source_url)}</span>
              <span className="ml-1 opacity-60">({e.flow_count} flow{e.flow_count !== 1 ? 's' : ''})</span>
            </div>
          ))}
        </div>
      )}

      {/* Recent threats */}
      {node.recent_threats.length > 0 && (
        <div className="mb-3">
          <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1.5">
            Recent threats ({node.recent_threats.length})
          </p>
          {node.recent_threats.map((t, i) => (
            <div key={i} className="text-xs mb-1.5 pb-1.5 border-b border-border last:border-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="font-mono text-[10px]" style={{ color: SEV_COLOR[t.severity] ?? '#6b7280' }}>
                  {t.severity}
                </span>
                <span className="text-muted-foreground text-[10px]">{relativeTime(t.created_at)}</span>
              </div>
              {t.detail && <p className="text-muted-foreground leading-snug">{t.detail}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Activity */}
      <div className="text-[11px] text-muted-foreground border-t border-border pt-2 mt-1 space-y-0.5">
        {node.call_count > 0 && <p>{node.call_count} ledger entr{node.call_count !== 1 ? 'ies' : 'y'}</p>}
        <p>Last seen: {relativeTime(node.last_seen_at)}</p>
        {node.category && <p>Category: {node.category}</p>}
      </div>
    </div>
  )
}

function safeHostname(url: string): string {
  try { return new URL(url).hostname } catch { return url }
}
