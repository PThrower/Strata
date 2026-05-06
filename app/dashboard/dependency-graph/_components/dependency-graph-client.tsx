'use client'

import { useState, useEffect, useRef } from 'react'
import type { DependencyGraph, GraphNode, GraphEdge } from '@/lib/dependency-graph'
import { safeHttpHref } from '@/lib/dependency-graph'
import { RiskBadge } from '../../_components/RiskBadge'
import NodeDetailPanel from './node-detail-panel'

// ── Design tokens ──────────────────────────────────────────────────────────────

const RISK_LEFT: Record<string, string> = {
  critical: 'rgba(239,68,68,0.55)', high: 'rgba(249,115,22,0.55)',
  medium: 'rgba(234,179,8,0.45)', low: 'rgba(34,197,94,0.45)', unknown: 'rgba(107,114,128,0.30)',
}
const RISK_FILL: Record<string, string> = {
  unknown: 'rgba(107,114,128,0.18)', low: 'rgba(34,197,94,0.16)',
  medium: 'rgba(234,179,8,0.18)', high: 'rgba(249,115,22,0.20)', critical: 'rgba(239,68,68,0.22)',
}
const RISK_STROKE: Record<string, string> = {
  unknown: '#6b7280', low: '#22c55e', medium: '#eab308', high: '#f97316', critical: '#ef4444',
}

const CARD: React.CSSProperties = {
  background: 'linear-gradient(135deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 35%, rgba(255,255,255,0.02) 70%, rgba(0,196,114,0.05) 100%)',
  backdropFilter: 'blur(28px) saturate(180%)', WebkitBackdropFilter: 'blur(28px) saturate(180%)',
  border: '1px solid rgba(255,255,255,0.10)', borderTopColor: 'rgba(255,255,255,0.28)', borderLeftColor: 'rgba(255,255,255,0.20)',
  borderRadius: '22px',
  boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.30), inset 1px 0 0 0 rgba(255,255,255,0.14), inset 0 -1px 0 0 rgba(0,0,0,0.30), inset 0 0 36px 0 rgba(0,196,114,0.04), 0 24px 60px -24px rgba(0,0,0,0.7), 0 4px 14px -4px rgba(0,0,0,0.4)',
}
const CHIP_BASE: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: '7px',
  padding: '5px 11px 5px 9px', borderRadius: '999px',
  fontFamily: 'var(--font-mono)', fontSize: '10.5px', fontWeight: 500,
  letterSpacing: '0.18em', textTransform: 'uppercase',
  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.14)',
  color: 'rgba(255,255,255,0.85)',
  whiteSpace: 'nowrap',
}
const PERIODS = [
  { value: '7d',  label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
  { value: 'all', label: 'All time' },
]

const SVG_W = 860
const SVG_H = 460
const NODE_R = 26

type View   = 'graph' | 'table'
type Filter = 'all' | 'high-risk' | 'circuit-broken' | 'net-egress'
type Pos    = { x: number; y: number }
type Vel    = { vx: number; vy: number }

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
function trunc(s: string, n: number): string {
  return s.length > n ? s.slice(0, n-1) + '…' : s
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

// ── Force-directed graph ──────────────────────────────────────────────────────

function ForceGraph({
  nodes,
  edges,
  selectedUrl,
  onSelect,
}: {
  nodes: GraphNode[]
  edges: GraphEdge[]
  selectedUrl: string | null
  onSelect: (url: string | null) => void
}) {
  // Simulation state lives in a ref (mutated outside React render cycle)
  const sim = useRef<{
    pos: Map<string, Pos>
    vel: Map<string, Vel>
    iter: number
    raf: number | null
    initialized: boolean
  }>({ pos: new Map(), vel: new Map(), iter: 0, raf: null, initialized: false })

  // tick just triggers re-render
  const [, setTick] = useState(0)

  const nodeKey = nodes.map(n => n.url).join('|')

  useEffect(() => {
    const s = sim.current

    // Cancel any running simulation
    if (s.raf !== null) { cancelAnimationFrame(s.raf); s.raf = null }

    // Initialize positions in a circle, reset velocities
    s.pos = new Map()
    s.vel = new Map()
    nodes.forEach((n, i) => {
      const angle = (i / Math.max(nodes.length, 1)) * 2 * Math.PI - Math.PI / 2
      const r = Math.min(SVG_W, SVG_H) * (nodes.length <= 4 ? 0.22 : 0.28)
      s.pos.set(n.url, { x: SVG_W / 2 + r * Math.cos(angle), y: SVG_H / 2 + r * Math.sin(angle) })
      s.vel.set(n.url, { vx: 0, vy: 0 })
    })
    s.iter = 0
    s.initialized = true

    // Run simulation
    function step() {
      if (s.iter >= 220) return
      s.iter++

      const urls = Array.from(s.pos.keys())

      // Repulsion between all node pairs
      for (let i = 0; i < urls.length; i++) {
        for (let j = i + 1; j < urls.length; j++) {
          const pa = s.pos.get(urls[i])!, pb = s.pos.get(urls[j])!
          const va = s.vel.get(urls[i])!, vb = s.vel.get(urls[j])!
          const dx = pa.x - pb.x, dy = pa.y - pb.y
          const dist = Math.sqrt(dx * dx + dy * dy) || 1
          const f = Math.min(6000 / (dist * dist), 24)
          const fx = (dx / dist) * f, fy = (dy / dist) * f
          s.vel.set(urls[i], { vx: va.vx + fx, vy: va.vy + fy })
          s.vel.set(urls[j], { vx: vb.vx - fx, vy: vb.vy - fy })
        }
      }

      // Spring attraction along edges
      for (const e of edges) {
        const pa = s.pos.get(e.source_url), pb = s.pos.get(e.dest_url)
        const va = s.vel.get(e.source_url), vb = s.vel.get(e.dest_url)
        if (!pa || !pb || !va || !vb) continue
        const dx = pb.x - pa.x, dy = pb.y - pa.y
        const dist = Math.sqrt(dx * dx + dy * dy) || 1
        const idealDist = nodes.length <= 3 ? 200 : 170
        const f = (dist - idealDist) * 0.010
        const fx = (dx / dist) * f, fy = (dy / dist) * f
        s.vel.set(e.source_url, { vx: va.vx + fx, vy: va.vy + fy })
        s.vel.set(e.dest_url,   { vx: vb.vx - fx, vy: vb.vy - fy })
      }

      // Gravity toward center + damping + position update
      const cx = SVG_W / 2, cy = SVG_H / 2
      for (const url of urls) {
        const p = s.pos.get(url)!, v = s.vel.get(url)!
        const gravStr = 0.007
        const nvx = (v.vx + (cx - p.x) * gravStr) * 0.84
        const nvy = (v.vy + (cy - p.y) * gravStr) * 0.84
        s.vel.set(url, { vx: nvx, vy: nvy })
        s.pos.set(url, {
          x: Math.max(NODE_R + 14, Math.min(SVG_W - NODE_R - 14, p.x + nvx)),
          y: Math.max(NODE_R + 24, Math.min(SVG_H - NODE_R - 24, p.y + nvy)),
        })
      }

      setTick(t => t + 1)
      s.raf = requestAnimationFrame(step)
    }

    s.raf = requestAnimationFrame(step)
    return () => { if (s.raf !== null) { cancelAnimationFrame(s.raf); s.raf = null } }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeKey])

  if (nodes.length === 0) return null

  const s = sim.current

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      style={{ display: 'block', cursor: 'default' }}
      onClick={() => onSelect(null)}
    >
      <defs>
        {Object.entries(RISK_STROKE).map(([rk, color]) => (
          <marker key={rk} id={`arr-${rk}`} markerWidth="9" markerHeight="7" refX="8" refY="3.5" orient="auto">
            <polygon points="0 0, 9 3.5, 0 7" fill={color} opacity={0.7} />
          </marker>
        ))}
      </defs>

      {/* ── Edges ── */}
      {edges.map((edge, i) => {
        const pa = s.pos.get(edge.source_url), pb = s.pos.get(edge.dest_url)
        if (!pa || !pb) return null
        const rk = edge.risk_level in RISK_STROKE ? edge.risk_level : 'unknown'
        const color = RISK_STROKE[rk]
        // Offset endpoints to circle edges, not centers
        const dx = pb.x - pa.x, dy = pb.y - pa.y
        const len = Math.sqrt(dx * dx + dy * dy) || 1
        const nx = dx / len, ny = dy / len
        const x1 = pa.x + nx * (NODE_R + 2)
        const y1 = pa.y + ny * (NODE_R + 2)
        const x2 = pb.x - nx * (NODE_R + 10)
        const y2 = pb.y - ny * (NODE_R + 10)
        // Gentle bezier curve
        const mx = (x1 + x2) / 2, my = (y1 + y2) / 2
        const curve = Math.min(len * 0.25, 50)
        const cx_ = mx - ny * curve, cy_ = my + nx * curve
        const pathD = `M ${x1.toFixed(1)} ${y1.toFixed(1)} Q ${cx_.toFixed(1)} ${cy_.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`
        const strokeW = Math.max(1.5, Math.min(4, 1.5 + edge.flow_count * 0.4))
        return (
          <g key={i}>
            <path d={pathD} fill="none" stroke={color} strokeWidth={strokeW} strokeOpacity={0.55}
              markerEnd={`url(#arr-${rk})`} />
            {/* Flow count midpoint label */}
            <text x={cx_} y={cy_ - 6} textAnchor="middle" fontSize={9}
              fontFamily="var(--font-mono)" fill={color} opacity={0.75}>
              {edge.flow_count > 1 ? edge.flow_count : ''}
            </text>
          </g>
        )
      })}

      {/* ── Nodes ── */}
      {nodes.map(node => {
        const pos = s.pos.get(node.url) ?? { x: SVG_W / 2, y: SVG_H / 2 }
        const rk = node.risk_level in RISK_FILL ? node.risk_level : 'unknown'
        const selected = selectedUrl === node.url
        const hostname = trunc(safeHostname(node.url), 16)
        const r = NODE_R + Math.round(Math.min(node.call_count / 25, 1) * 6)
        return (
          <g
            key={node.url}
            transform={`translate(${pos.x.toFixed(1)},${pos.y.toFixed(1)})`}
            onClick={e => { e.stopPropagation(); onSelect(selected ? null : node.url) }}
            style={{ cursor: 'pointer' }}
          >
            {/* Selection glow */}
            {selected && (
              <circle r={r + 8} fill="rgba(0,196,114,0.08)" stroke="#00c472" strokeWidth={2} />
            )}
            {/* Circuit breaker ring */}
            {node.circuit_broken && !selected && (
              <circle r={r + 5} fill="none" stroke="#ef4444" strokeWidth={1.5} strokeOpacity={0.6} />
            )}
            {/* Main node circle */}
            <circle
              r={r}
              fill={RISK_FILL[rk]}
              stroke={selected ? '#00c472' : RISK_STROKE[rk]}
              strokeWidth={selected ? 2.5 : 1.5}
            />
            {/* Risk label inside */}
            <text textAnchor="middle" dy="0.35em" fontSize={9}
              fontFamily="var(--font-mono)" fill="rgba(255,255,255,0.50)"
              style={{ userSelect: 'none', pointerEvents: 'none' }}>
              {rk}
            </text>
            {/* Status icons above */}
            {node.circuit_broken && (
              <text y={-r - 8} textAnchor="middle" fontSize={11}
                style={{ userSelect: 'none', pointerEvents: 'none' }}>⚡</text>
            )}
            {node.is_quarantined && (
              <text y={node.circuit_broken ? -r - 22 : -r - 8} textAnchor="middle" fontSize={11}
                style={{ userSelect: 'none', pointerEvents: 'none' }}>⛔</text>
            )}
            {/* Threat dot */}
            {node.recent_threats.length > 0 && (
              <circle cx={r * 0.72} cy={-r * 0.72} r={5} fill="#f97316" />
            )}
            {/* Hostname label */}
            <text y={r + 16} textAnchor="middle" fontSize={10}
              fontFamily="var(--font-mono)" fill="rgba(255,255,255,0.72)"
              style={{ userSelect: 'none', pointerEvents: 'none' }}>
              {hostname}
            </text>
            {/* Call count */}
            {node.call_count > 0 && (
              <text y={r + 28} textAnchor="middle" fontSize={8}
                fontFamily="var(--font-mono)" fill="rgba(255,255,255,0.32)"
                style={{ userSelect: 'none', pointerEvents: 'none' }}>
                {node.call_count} call{node.call_count !== 1 ? 's' : ''}
              </text>
            )}
          </g>
        )
      })}
    </svg>
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
  const [view,        setView]        = useState<View>('graph')
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

  const TAB = (active: boolean): React.CSSProperties => ({
  padding: '6px 14px', borderRadius: '999px',
  fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 500,
  letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer',
  border: active ? '1px solid rgba(0,196,114,0.40)' : '1px solid rgba(255,255,255,0.10)',
  background: active ? 'rgba(0,196,114,0.12)' : 'rgba(255,255,255,0.04)',
  color: active ? '#00c472' : 'rgba(255,255,255,0.55)',
  transition: 'all 150ms',
})

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
          <div key={label} style={CHIP_BASE}>
            <span style={{ color: 'var(--ink-faint)', marginRight: 2 }}>{label}</span>
            <strong style={{ fontVariantNumeric: 'tabular-nums', color: c }}>{value}</strong>
          </div>
        ))}
      </div>

      {/* ── No flows hint ── */}
      {graph.summary.no_edges && (
        <div style={{ ...CARD, padding: '11px 16px', marginBottom: 14, fontSize: 12, color: 'var(--ink-faint)' }}>
          No data flows recorded yet — showing server inventory.
          Call{' '}
          <code style={{ fontFamily: 'var(--font-mono)', fontSize: 10, background: 'rgba(255,255,255,0.06)', padding: '1px 5px', borderRadius: 3 }}>track_data_flow()</code>
          {' '}after your agents move data between servers to see edges.
        </div>
      )}

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex gap-1">
          {(['graph', 'table'] as View[]).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`${view === v ? 'border-border font-medium text-foreground'  : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
              {v === 'graph' ? '⬡ Graph' : '☰ Table'}
            </button>
          ))}
        </div>
        <span className="text-muted-foreground text-xs">·</span>
        <div className="flex gap-1">
          {PERIODS.map(p => (
            <button key={p.value} onClick={() => handlePeriodChange(p.value)}
              className={`${period === p.value ? 'border-border font-medium text-foreground'  : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
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

      {/* ── Graph view ── */}
      {view === 'graph' && (
        <div className="flex gap-4 items-start">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ ...CARD, padding: 8, overflow: 'hidden' }}>
              <ForceGraph
                nodes={graph.nodes}
                edges={graph.edges}
                selectedUrl={selectedUrl}
                onSelect={setSelectedUrl}
              />
            </div>
            <DataFlowsSection edges={graph.edges} />
          </div>
          {selectedNode && (
            <div className="dep-graph-panel-wrapper">
              <NodeDetailPanel node={selectedNode} edges={graph.edges} onClose={() => setSelectedUrl(null)} />
            </div>
          )}
        </div>
      )}

      {/* ── Table view ── */}
      {view === 'table' && (
        <>
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {(['all', 'high-risk', 'circuit-broken', 'net-egress'] as Filter[]).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`${filter === f ? 'border-border font-medium text-foreground'  : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
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
                    onClick={() => { setView('graph'); setSelectedUrl(node.url) }}>
                    <td className="px-4 py-3">
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>{safeHostname(node.url)}</p>
                      {node.url && (() => {
                        const href = safeHttpHref(node.url)
                        return href ? (
                          <a href={href} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                            style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-faint)', textDecoration: 'none', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>
                            {node.url.replace(/^https?:\/\//, '')}
                          </a>
                        ) : null
                      })()}
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
