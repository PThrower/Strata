'use client'

import { useState, useEffect } from 'react'
import type { DependencyGraph, GraphNode, GraphEdge } from '@/lib/dependency-graph'
import { safeHttpHref } from '@/lib/dependency-graph'
import { RiskBadge } from '../../_components/RiskBadge'
import NodeDetailPanel from './node-detail-panel'

// ── Design tokens ──────────────────────────────────────────────────────────────

const RISK_LEFT: Record<string, string> = {
  critical: 'rgba(239,68,68,0.55)', high: 'rgba(249,115,22,0.55)',
  medium: 'rgba(234,179,8,0.45)', low: 'rgba(34,197,94,0.45)', unknown: 'rgba(107,114,128,0.30)',
}

const CARD: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(16px) saturate(1.5)', WebkitBackdropFilter: 'blur(16px) saturate(1.5)', border: '1px solid rgba(255,255,255,0.09)', borderTopColor: 'rgba(255,255,255,0.15)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 8px 32px rgba(0,0,0,0.25)', borderRadius: 12,
}

const CHIP_BASE: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 5,
  padding: '3px 10px', borderRadius: 6,
  fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 400,
  border: '1px solid', whiteSpace: 'nowrap',
  background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.09)',
}

const PERIODS = [
  { value: '7d',  label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
  { value: 'all', label: 'All time' },
]

type View   = 'cards' | 'table'
type Filter = 'all' | 'high-risk' | 'circuit-broken' | 'net-egress'

// ── Helpers ───────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60)  return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60)  return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24)  return `${h}h ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function safeHostname(url: string): string {
  try { return new URL(url).hostname } catch { return url }
}

// ── Flag chips ─────────────────────────────────────────────────────────────────

function FlagChips({ flags }: { flags: string[] }) {
  const danger = new Set(['shell_exec', 'dynamic_eval', 'arbitrary_sql'])
  if (flags.length === 0) return null
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
      {flags.slice(0, 4).map(f => (
        <span key={f} style={{
          fontFamily: 'var(--font-mono)', fontSize: 9, padding: '1px 5px', borderRadius: 3,
          background: danger.has(f) ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.05)',
          border: `1px solid ${danger.has(f) ? 'rgba(239,68,68,0.35)' : 'rgba(255,255,255,0.08)'}`,
          color: danger.has(f) ? '#ef4444' : 'var(--ink-muted)',
        }}>
          {f}
        </span>
      ))}
      {flags.length > 4 && (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--ink-faint)' }}>+{flags.length - 4}</span>
      )}
    </div>
  )
}

// ── Node card ─────────────────────────────────────────────────────────────────

function NodeCard({ node, selected, onSelect }: { node: GraphNode; selected: boolean; onSelect: () => void }) {
  return (
    <div
      onClick={onSelect}
      style={{
        ...CARD,
        padding: 14,
        cursor: 'pointer',
        borderLeft: `3px solid ${RISK_LEFT[node.risk_level] ?? RISK_LEFT.unknown}`,
        ...(selected ? { borderColor: '#00c472', boxShadow: `${CARD.boxShadow}, 0 0 0 1px #00c472` } : {}),
        transition: 'border-color 150ms, box-shadow 150ms',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 500, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }} title={node.url ?? node.name}>
          {node.url ? safeHostname(node.url) : node.name}
        </p>
        <RiskBadge level={node.risk_level} />
      </div>
      <FlagChips flags={node.capability_flags} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--ink-faint)' }}>
        {node.call_count > 0 && <span>{node.call_count} calls</span>}
        {node.circuit_broken && <span title="Circuit breaker tripped" style={{ color: '#ef4444' }}>⚡</span>}
        {node.is_quarantined  && <span title="Quarantined" style={{ color: '#f97316' }}>⛔</span>}
        {node.recent_threats.length > 0 && <span style={{ color: '#f97316' }}>⚠ {node.recent_threats.length}</span>}
        {!node.in_directory && <span style={{ fontStyle: 'italic' }}>unknown</span>}
        <span style={{ marginLeft: 'auto', color: 'var(--ink-faint)' }}>{relativeTime(node.last_seen_at)}</span>
      </div>
    </div>
  )
}

// ── Data flows section ────────────────────────────────────────────────────────

function DataFlowsSection({ edges }: { edges: GraphEdge[] }) {
  const [open, setOpen] = useState(false)
  if (edges.length === 0) return null
  return (
    <div style={{ marginTop: 24 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 500, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink-faint)', marginBottom: 8 }}
      >
        <span style={{ width: 20, height: 1, background: 'var(--hair)', display: 'inline-block' }} />
        Data Flows ({edges.length})
        <span style={{ fontSize: 8 }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div style={{ ...CARD, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-faint)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                {['Source', 'Destination', 'Flows', 'Risk', 'Tags', 'Last'].map((h, i) => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: i === 5 ? 'right' : 'left', fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {edges.map((e, i) => (
                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '9px 14px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-soft)' }}>{safeHostname(e.source_url)}</td>
                  <td style={{ padding: '9px 14px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-soft)' }}>
                    {safeHostname(e.dest_url)}{e.dest_has_net_egress && <span style={{ marginLeft: 4, fontSize: 9, color: '#f97316' }}>↗egress</span>}
                  </td>
                  <td style={{ padding: '9px 14px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-muted)' }}>{e.flow_count}</td>
                  <td style={{ padding: '9px 14px' }}><RiskBadge level={e.risk_level} /></td>
                  <td style={{ padding: '9px 14px' }}>
                    <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                      {(e.data_tags ?? []).map(t => (
                        <span key={t} style={{ fontFamily: 'var(--font-mono)', fontSize: 9, padding: '1px 5px', borderRadius: 3, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--ink-muted)' }}>{t}</span>
                      ))}
                    </div>
                  </td>
                  <td style={{ padding: '9px 14px', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-faint)', textAlign: 'right', whiteSpace: 'nowrap' }}>{relativeTime(e.last_flow_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Main client ───────────────────────────────────────────────────────────────

export default function DependencyGraphClient({
  graph,
  initialPeriod,
  highlightUrl,
}: {
  graph:         DependencyGraph
  initialPeriod: string
  highlightUrl:  string | null
}) {
  const [view,        setView]        = useState<View>('cards')
  const [filter,      setFilter]      = useState<Filter>('all')
  const [selectedUrl, setSelectedUrl] = useState<string | null>(highlightUrl)
  const [period,      setPeriod]      = useState(initialPeriod)

  useEffect(() => {
    if (highlightUrl) setSelectedUrl(highlightUrl)
  }, [highlightUrl])

  const selectedNode = selectedUrl ? graph.nodes.find(n => n.url === selectedUrl) ?? null : null

  function handlePeriodChange(p: string) {
    setPeriod(p)
    const url = new URL(window.location.href)
    url.searchParams.set('period', p)
    if (selectedUrl) url.searchParams.set('highlight', selectedUrl)
    else url.searchParams.delete('highlight')
    window.location.href = url.toString()
  }

  const netEgressDestUrls = new Set(graph.edges.filter(e => e.dest_has_net_egress).map(e => e.dest_url))
  const filteredNodes = graph.nodes.filter(n => {
    if (filter === 'high-risk')      return n.risk_level === 'high' || n.risk_level === 'critical'
    if (filter === 'circuit-broken') return n.circuit_broken
    if (filter === 'net-egress')     return netEgressDestUrls.has(n.url)
    return true
  })

  const tabBase = 'px-3 py-1.5 text-xs rounded-md border transition-colors'

  if (graph.nodes.length === 0) {
    return (
      <div style={{ ...CARD, padding: 48, textAlign: 'center' }}>
        <p className="text-base font-medium mb-2">No dependency data yet.</p>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Your agents haven&apos;t logged any MCP server activity in the selected period.
        </p>
      </div>
    )
  }

  const atRisk = (graph.summary.risk_distribution.high ?? 0) + (graph.summary.risk_distribution.critical ?? 0)
  const withThreats = graph.nodes.filter(n => n.recent_threats.length > 0).length

  return (
    <>
      {/* ── Summary chips ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
        {[
          { label: 'Total',          value: graph.summary.total_nodes,          c: 'var(--ink-muted)' },
          { label: 'At risk',        value: atRisk,                             c: atRisk > 0 ? '#f97316' : 'var(--ink-muted)' },
          { label: 'Circuit broken', value: graph.summary.circuit_broken_count, c: graph.summary.circuit_broken_count > 0 ? '#ef4444' : 'var(--ink-muted)' },
          { label: 'With threats',   value: withThreats,                        c: withThreats > 0 ? '#f97316' : 'var(--ink-muted)' },
        ].map(({ label, value, c }) => (
          <div key={label} style={{ ...CHIP_BASE }}>
            <span style={{ color: 'var(--ink-faint)', marginRight: 2 }}>{label}</span>
            <strong style={{ fontVariantNumeric: 'tabular-nums', color: c }}>{value}</strong>
          </div>
        ))}
      </div>

      {/* ── No flows hint ── */}
      {graph.summary.no_edges && (
        <div style={{ ...CARD, padding: '11px 16px', marginBottom: 14, fontSize: 12, color: 'var(--ink-faint)' }}>
          No data flows recorded yet. Call{' '}
          <code style={{ fontFamily: 'var(--font-mono)', fontSize: 10, background: 'rgba(255,255,255,0.06)', padding: '1px 5px', borderRadius: 3 }}>track_data_flow()</code>
          {' '}to see directed edges.
        </div>
      )}

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex gap-1">
          {(['cards', 'table'] as View[]).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`${tabBase} ${view === v ? 'border-border bg-zinc-100 dark:bg-zinc-800 font-medium text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
              {v === 'cards' ? '⬡ Cards' : '☰ Table'}
            </button>
          ))}
        </div>
        <span className="text-muted-foreground text-xs">·</span>
        <div className="flex gap-1">
          {PERIODS.map(p => (
            <button key={p.value} onClick={() => handlePeriodChange(p.value)}
              className={`${tabBase} ${period === p.value ? 'border-border bg-zinc-100 dark:bg-zinc-800 font-medium text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
              {p.label}
            </button>
          ))}
        </div>
        <span className="ml-auto text-xs text-muted-foreground">
          {graph.summary.total_count_before_cap > graph.nodes.length
            ? `${graph.nodes.length} of ${graph.summary.total_count_before_cap} (risk-first)`
            : `${graph.nodes.length} server${graph.nodes.length !== 1 ? 's' : ''}`}
        </span>
      </div>

      {/* ── Cards view ── */}
      {view === 'cards' && (
        <div className="flex gap-4 items-start">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="dep-graph-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              <style>{`@media(max-width:960px){.dep-graph-grid{grid-template-columns:repeat(2,1fr)!important}}@media(max-width:580px){.dep-graph-grid{grid-template-columns:1fr!important}}`}</style>
              {graph.nodes.map(node => (
                <NodeCard key={node.url} node={node}
                  selected={selectedUrl === node.url}
                  onSelect={() => setSelectedUrl(selectedUrl === node.url ? null : node.url)} />
              ))}
            </div>
            <DataFlowsSection edges={graph.edges} />
          </div>
          {selectedNode && (
            <NodeDetailPanel node={selectedNode} edges={graph.edges} onClose={() => setSelectedUrl(null)} />
          )}
        </div>
      )}

      {/* ── Table view ── */}
      {view === 'table' && (
        <>
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {(['all', 'high-risk', 'circuit-broken', 'net-egress'] as Filter[]).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`${tabBase} ${filter === f ? 'border-border bg-zinc-100 dark:bg-zinc-800 font-medium text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
                {f === 'all' ? 'All' : f === 'high-risk' ? '⚠ High Risk' : f === 'circuit-broken' ? '⚡ Circuit Broken' : '↗ Net Egress Dest'}
              </button>
            ))}
            <span className="text-xs text-muted-foreground ml-auto">{filteredNodes.length} server{filteredNodes.length !== 1 ? 's' : ''}</span>
          </div>
          <div style={{ ...CARD, overflowX: 'auto' }}>
            <table className="w-full text-sm">
              <thead style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <tr style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-faint)' }}>
                  {['Server','Risk','Sec','Flags','Calls','Last seen','Status'].map(h => (
                    <th key={h} className="px-4 py-3 font-medium text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredNodes.map(node => (
                  <tr key={node.url} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer' }}
                    onClick={() => { setView('cards'); setSelectedUrl(node.url) }}>
                    <td className="px-4 py-3">
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>{safeHostname(node.url)}</p>
                    </td>
                    <td className="px-4 py-3"><RiskBadge level={node.risk_level} /></td>
                    <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-muted)' }}>{node.security_score ?? '—'}</td>
                    <td className="px-4 py-3"><FlagChips flags={node.capability_flags} /></td>
                    <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-muted)', fontVariantNumeric: 'tabular-nums' }}>{node.call_count || '—'}</td>
                    <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-faint)', whiteSpace: 'nowrap' }}>{relativeTime(node.last_seen_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-sm">
                        {node.circuit_broken  && <span title="Circuit broken">⚡</span>}
                        {node.is_quarantined  && <span title="Quarantined">⛔</span>}
                        {node.policy_blocked  && <span title="Policy blocked" style={{ color: '#8b5cf6' }}>⬡</span>}
                        {node.recent_threats.length > 0 && <span title={`${node.recent_threats.length} threats`}>🔔</span>}
                        {!node.in_directory   && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-faint)', fontStyle: 'italic' }}>unknown</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredNodes.length === 0 && (
              <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--ink-faint)', padding: 32 }}>No servers match this filter.</p>
            )}
          </div>
        </>
      )}
    </>
  )
}
