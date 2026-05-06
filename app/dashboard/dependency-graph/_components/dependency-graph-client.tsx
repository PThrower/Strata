'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { DependencyGraph, GraphNode } from '@/lib/dependency-graph'
import { safeHttpHref } from '@/lib/dependency-graph'
import GraphSvg from './graph-svg'
import NodeDetailPanel from './node-detail-panel'

const RISK_COLOR: Record<string, string> = {
  critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#22c55e', unknown: '#6b7280',
}

const PERIODS = [
  { value: '7d',  label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
  { value: 'all', label: 'All time' },
]

type View    = 'graph' | 'table'
type Filter  = 'all' | 'high-risk' | 'circuit-broken' | 'net-egress'

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

function FlagChips({ flags }: { flags: string[] }) {
  const danger = new Set(['shell_exec', 'dynamic_eval', 'arbitrary_sql'])
  return (
    <div className="flex flex-wrap gap-0.5">
      {flags.slice(0, 4).map(f => (
        <span
          key={f}
          className="font-mono text-[9px] px-1 py-0.5 rounded"
          style={{
            background: danger.has(f) ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.06)',
            color:      danger.has(f) ? '#ef4444'              : 'rgba(255,255,255,0.45)',
          }}
        >
          {f}
        </span>
      ))}
      {flags.length > 4 && <span className="text-[9px] text-muted-foreground">+{flags.length - 4}</span>}
    </div>
  )
}

export default function DependencyGraphClient({
  graph,
  initialPeriod,
  highlightUrl,
}: {
  graph:         DependencyGraph
  initialPeriod: string
  highlightUrl:  string | null
}) {
  const [view,        setView]        = useState<View>('graph')
  const [filter,      setFilter]      = useState<Filter>('all')
  const [selectedUrl, setSelectedUrl] = useState<string | null>(highlightUrl)
  const [period,      setPeriod]      = useState(initialPeriod)

  // Pre-select highlighted node from URL param
  useEffect(() => {
    if (highlightUrl) setSelectedUrl(highlightUrl)
  }, [highlightUrl])

  const selectedNode = selectedUrl ? graph.nodes.find(n => n.url === selectedUrl) ?? null : null

  // Period change navigates to reload server data
  function handlePeriodChange(p: string) {
    setPeriod(p)
    const url = new URL(window.location.href)
    url.searchParams.set('period', p)
    if (selectedUrl) url.searchParams.set('highlight', selectedUrl)
    else url.searchParams.delete('highlight')
    window.location.href = url.toString()
  }

  // Table filter
  const netEgressDestUrls = new Set(graph.edges.filter(e => e.dest_has_net_egress).map(e => e.dest_url))
  const filteredNodes = graph.nodes.filter(n => {
    if (filter === 'high-risk')      return n.risk_level === 'high' || n.risk_level === 'critical'
    if (filter === 'circuit-broken') return n.circuit_broken
    if (filter === 'net-egress')     return netEgressDestUrls.has(n.url)
    return true
  })

  const card    = 'bg-white dark:bg-zinc-900 rounded-lg border border-border'
  const tabBase = 'px-3 py-1.5 text-xs rounded-md border transition-colors'

  // ── Empty state ─────────────────────────────────────────────────────────────

  if (graph.nodes.length === 0) {
    return (
      <div className={`${card} p-12 text-center`}>
        <p className="text-base font-medium mb-2">No dependency data yet.</p>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Your agents haven&apos;t logged any MCP server activity in the selected period.
          Add the Strata MCP server to your agent config, or use{' '}
          <code className="text-xs bg-muted px-1 py-0.5 rounded">mcp/verify</code> before connecting to servers.
        </p>
      </div>
    )
  }

  return (
    <>
      {/* ── Summary cards ── */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total servers',    value: graph.summary.total_nodes,          color: 'var(--emerald-glow)' },
          { label: 'At risk',          value: (graph.summary.risk_distribution.high ?? 0) + (graph.summary.risk_distribution.critical ?? 0), color: '#f97316' },
          { label: 'Circuit broken',   value: graph.summary.circuit_broken_count, color: '#ef4444' },
          { label: 'Data flows',       value: graph.summary.total_edges,          color: 'rgba(255,255,255,0.5)' },
        ].map(({ label, value, color }) => (
          <div key={label} className={`${card} px-4 py-3`}>
            <p className="text-xs text-muted-foreground mb-1">{label}</p>
            <p style={{ fontSize: 24, fontWeight: 600, color, fontVariantNumeric: 'tabular-nums' }}>{value}</p>
          </div>
        ))}
      </div>

      {/* ── No edges hint ── */}
      {graph.summary.no_edges && graph.nodes.length > 0 && (
        <div className={`${card} px-4 py-3 mb-4 flex items-center gap-3 text-sm`}>
          <span className="text-muted-foreground">
            No data flows recorded yet — showing server inventory only.
            Call{' '}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">track_data_flow()</code>
            {' '}after your agents move data between servers to see directed edges.
          </span>
        </div>
      )}

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        {/* View toggle */}
        <div className="flex gap-1">
          {(['graph', 'table'] as View[]).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`${tabBase} ${view === v
                ? 'border-border bg-zinc-100 dark:bg-zinc-800 font-medium text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            >
              {v === 'graph' ? '⬡ Graph' : '☰ Table'}
            </button>
          ))}
        </div>

        <span className="text-muted-foreground text-xs">·</span>

        {/* Period */}
        <div className="flex gap-1">
          {PERIODS.map(p => (
            <button
              key={p.value}
              onClick={() => handlePeriodChange(p.value)}
              className={`${tabBase} ${period === p.value
                ? 'border-border bg-zinc-100 dark:bg-zinc-800 font-medium text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <span className="ml-auto text-xs text-muted-foreground">
          {graph.summary.total_count_before_cap > graph.nodes.length
            ? `Showing ${graph.nodes.length} of ${graph.summary.total_count_before_cap} servers (highest-risk first)`
            : `${graph.nodes.length} server${graph.nodes.length !== 1 ? 's' : ''}`
          }
          {graph.summary.total_edges > 0 && ` · ${graph.summary.total_edges} flow${graph.summary.total_edges !== 1 ? 's' : ''}`}
        </span>
      </div>

      {/* ── Legend ── */}
      {view === 'graph' && (
        <div className="flex items-center gap-4 mb-3 flex-wrap">
          {Object.entries(RISK_COLOR).map(([level, color]) => (
            <span key={level} className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono uppercase">
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, opacity: 0.7, display: 'inline-block', flexShrink: 0 }} />
              {level}
            </span>
          ))}
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
            <span style={{ width: 10, height: 2, background: '#6b7280', display: 'inline-block', opacity: 0.6 }} />
            dashed = net_egress
          </span>
          <span className="text-[10px] text-muted-foreground font-mono">⚡ = circuit broken · ⛔ = quarantined</span>
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f97316', display: 'inline-block' }} /> threats
          </span>
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#8b5cf6', display: 'inline-block' }} /> policy blocked
          </span>
        </div>
      )}

      {/* ── Graph view ── */}
      {view === 'graph' && (
        <div className="flex gap-4 items-start">
          <div className={`${card} flex-1 min-w-0 p-3`}>
            <GraphSvg
              nodes={graph.nodes}
              edges={graph.edges}
              noEdges={graph.summary.no_edges}
              selectedUrl={selectedUrl}
              onSelect={setSelectedUrl}
            />
          </div>
          {selectedNode && (
            <NodeDetailPanel
              node={selectedNode}
              edges={graph.edges}
              onClose={() => setSelectedUrl(null)}
            />
          )}
        </div>
      )}

      {/* ── Table view ── */}
      {view === 'table' && (
        <>
          {/* Table filter bar */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {([
              ['all',            'All'],
              ['high-risk',      '⚠ High Risk'],
              ['circuit-broken', '⚡ Circuit Broken'],
              ['net-egress',     '↗ Net Egress Dest'],
            ] as [Filter, string][]).map(([f, label]) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`${tabBase} ${filter === f
                  ? 'border-border bg-zinc-100 dark:bg-zinc-800 font-medium text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'}`}
              >
                {label}
              </button>
            ))}
            <span className="text-xs text-muted-foreground ml-auto">
              {filteredNodes.length} server{filteredNodes.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className={`${card} overflow-x-auto`}>
            <table className="w-full text-sm">
              <thead className="text-left border-b border-border">
                <tr className="text-xs text-muted-foreground uppercase tracking-wider">
                  <th className="px-4 py-3 font-medium">Server</th>
                  <th className="px-4 py-3 font-medium">Risk</th>
                  <th className="px-4 py-3 font-medium">Sec</th>
                  <th className="px-4 py-3 font-medium">Flags</th>
                  <th className="px-4 py-3 font-medium">Calls</th>
                  <th className="px-4 py-3 font-medium">Last seen</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredNodes.map(node => (
                  <tr
                    key={node.url}
                    className="border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => { setView('graph'); setSelectedUrl(node.url) }}
                    title="Click to view in graph"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-sm truncate max-w-[200px]" title={node.name}>{node.name}</p>
                      {node.url && (() => {
                        const href = safeHttpHref(node.url)
                        return href ? (
                          <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="font-mono text-xs text-muted-foreground hover:text-foreground transition-colors truncate block max-w-[200px]"
                            title={node.url}
                          >
                            {safeHostname(node.url)}
                          </a>
                        ) : (
                          <span className="font-mono text-xs text-muted-foreground truncate block max-w-[200px]" title={node.url}>
                            {safeHostname(node.url)}
                          </span>
                        )
                      })()}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap"
                        style={{ background: `${RISK_COLOR[node.risk_level] ?? '#6b7280'}20`, color: RISK_COLOR[node.risk_level] ?? '#6b7280', border: `1px solid ${RISK_COLOR[node.risk_level] ?? '#6b7280'}40` }}
                      >
                        {node.risk_level}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {node.security_score ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <FlagChips flags={node.capability_flags} />
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground tabular-nums">
                      {node.call_count || '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {relativeTime(node.last_seen_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {node.circuit_broken  && <span title="Circuit broken"  className="text-sm">⚡</span>}
                        {node.is_quarantined  && <span title="Quarantined"     className="text-sm">⛔</span>}
                        {node.policy_blocked  && <span title="Policy blocked"  className="text-sm" style={{ color: '#8b5cf6' }}>⬡</span>}
                        {node.recent_threats.length > 0 && (
                          <span title={`${node.recent_threats.length} recent threat${node.recent_threats.length !== 1 ? 's' : ''}`} className="text-sm">🔔</span>
                        )}
                        {!node.in_directory && (
                          <span title="Not in Strata directory" className="text-xs text-muted-foreground italic">unknown</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredNodes.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">No servers match this filter.</p>
            )}
          </div>
        </>
      )}
    </>
  )
}

function safeHostname(url: string): string {
  try { return new URL(url).hostname } catch { return url }
}
