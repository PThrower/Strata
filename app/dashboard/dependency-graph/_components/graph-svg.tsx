'use client'

import type { GraphNode, GraphEdge } from '@/lib/dependency-graph'

// ── Layout constants ──────────────────────────────────────────────────────────

const COL_X   = [100, 400, 700]   // x-centers for source / bidirectional / dest columns
const Y_START = 70
const Y_GAP   = 94
const SVG_W   = 800

// Grid fallback (no edges)
const GRID_COLS  = 4
const GRID_CW    = 190
const GRID_RH    = 110

// ── Visual tokens ─────────────────────────────────────────────────────────────

const RISK_FILL: Record<string, string> = {
  unknown:  'rgba(107,114,128,0.20)',
  low:      'rgba(34,197,94,0.18)',
  medium:   'rgba(234,179,8,0.20)',
  high:     'rgba(249,115,22,0.22)',
  critical: 'rgba(239,68,68,0.24)',
}
const RISK_STROKE: Record<string, string> = {
  unknown:  '#6b7280',
  low:      '#22c55e',
  medium:   '#eab308',
  high:     '#f97316',
  critical: '#ef4444',
}
const RISK_MARKER_FILL: Record<string, string> = {
  unknown: '#6b7280', low: '#22c55e', medium: '#eab308', high: '#f97316', critical: '#ef4444',
}

function nodeRadius(callCount: number): number {
  return Math.round(22 + Math.min(1, callCount / 50) * 12)
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + '…' : s
}

// ── Column layout ─────────────────────────────────────────────────────────────

interface NodePos {
  node: GraphNode
  x: number
  y: number
}

function buildColumnLayout(nodes: GraphNode[], edges: GraphEdge[]): NodePos[] {
  const sourceUrls = new Set(edges.map(e => e.source_url))
  const destUrls   = new Set(edges.map(e => e.dest_url))

  // Categorise
  const cols: GraphNode[][] = [[], [], []]  // [sourceOnly, both+isolated, destOnly]
  for (const n of nodes) {
    const isSrc  = sourceUrls.has(n.url)
    const isDest = destUrls.has(n.url)
    if (isSrc && !isDest)       cols[0].push(n)
    else if (isDest && !isSrc)  cols[2].push(n)
    else                        cols[1].push(n)
  }

  // Sort each column: critical first, then call_count desc
  const riskOrder: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1, unknown: 0 }
  for (const col of cols) {
    col.sort((a, b) =>
      (riskOrder[b.risk_level] ?? 0) - (riskOrder[a.risk_level] ?? 0) ||
      b.call_count - a.call_count
    )
  }

  const positions: NodePos[] = []
  for (let c = 0; c < 3; c++) {
    cols[c].forEach((n, i) => {
      positions.push({ node: n, x: COL_X[c], y: Y_START + i * Y_GAP })
    })
  }
  return positions
}

function buildGridLayout(nodes: GraphNode[]): NodePos[] {
  // Sort critical → high → medium → low → unknown, then call_count desc
  const riskOrder: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1, unknown: 0 }
  const sorted = [...nodes].sort((a, b) =>
    (riskOrder[b.risk_level] ?? 0) - (riskOrder[a.risk_level] ?? 0) ||
    b.call_count - a.call_count
  )
  return sorted.map((node, i) => ({
    node,
    x: (i % GRID_COLS) * GRID_CW + GRID_CW / 2,
    y: Math.floor(i / GRID_COLS) * GRID_RH + Y_START,
  }))
}

// ── SVG dimensions ────────────────────────────────────────────────────────────

function svgHeight(positions: NodePos[], isGrid: boolean): number {
  if (positions.length === 0) return 200
  const maxY = Math.max(...positions.map(p => p.y))
  const rMax = Math.max(...positions.map(p => nodeRadius(p.node.call_count)))
  return maxY + rMax + (isGrid ? GRID_RH / 2 : 60)
}

// ── Edge path ─────────────────────────────────────────────────────────────────

function edgePath(sx: number, sy: number, ex: number, ey: number, r1: number, r2: number): string {
  const dx = ex - sx, dy = ey - sy
  const len = Math.sqrt(dx * dx + dy * dy) || 1
  const nx = dx / len, ny = dy / len
  const ax = sx + nx * r1
  const ay = sy + ny * r1
  const bx = ex - nx * r2
  const by = ey - ny * r2
  const mx = (ax + bx) / 2
  return `M ${ax.toFixed(1)} ${ay.toFixed(1)} C ${mx.toFixed(1)} ${ay.toFixed(1)} ${mx.toFixed(1)} ${by.toFixed(1)} ${bx.toFixed(1)} ${by.toFixed(1)}`
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  nodes:       GraphNode[]
  edges:       GraphEdge[]
  noEdges:     boolean
  selectedUrl: string | null
  onSelect:    (url: string | null) => void
}

export default function GraphSvg({ nodes, edges, noEdges, selectedUrl, onSelect }: Props) {
  const isGrid     = noEdges || edges.length === 0
  const positions  = isGrid ? buildGridLayout(nodes) : buildColumnLayout(nodes, edges)
  const posMap     = new Map<string, { x: number; y: number }>(positions.map(p => [p.node.url, { x: p.x, y: p.y }]))
  const svgWidth   = isGrid ? GRID_COLS * GRID_CW : SVG_W
  const svgH       = svgHeight(positions, isGrid)
  const riskKeys   = ['unknown', 'low', 'medium', 'high', 'critical']

  return (
    <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 540, cursor: 'default' }}>
      <svg
        width={svgWidth}
        height={svgH}
        viewBox={`0 0 ${svgWidth} ${svgH}`}
        aria-label="MCP server dependency graph"
        onClick={() => onSelect(null)}
        style={{ display: 'block' }}
      >
        {/* ── Arrowhead markers ── */}
        <defs>
          {riskKeys.map(rk => (
            <marker
              key={rk}
              id={`arrow-${rk}`}
              markerWidth="9" markerHeight="7"
              refX="8" refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 9 3.5, 0 7" fill={RISK_MARKER_FILL[rk]} opacity="0.75" />
            </marker>
          ))}
        </defs>

        {/* ── Column headers (only in column layout) ── */}
        {!isGrid && (
          <>
            {[['Sources', 0], ['Bidirectional', 1], ['Destinations', 2]].map(([label, ci]) => (
              <text
                key={ci as number}
                x={COL_X[ci as number]}
                y={24}
                textAnchor="middle"
                style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fill: 'rgba(255,255,255,0.28)', letterSpacing: '0.12em', textTransform: 'uppercase' }}
              >
                {label}
              </text>
            ))}
          </>
        )}

        {/* ── Edges ── */}
        {edges.map((edge, i) => {
          const sp = posMap.get(edge.source_url)
          const dp = posMap.get(edge.dest_url)
          if (!sp || !dp) return null
          const srcNode = nodes.find(n => n.url === edge.source_url)
          const dstNode = nodes.find(n => n.url === edge.dest_url)
          const r1 = nodeRadius(srcNode?.call_count ?? 0)
          const r2 = nodeRadius(dstNode?.call_count ?? 0)
          const strokeW = Math.max(1.5, Math.min(5, 1.5 + edge.flow_count / 8))
          const dash = edge.dest_has_net_egress ? '6 3' : undefined
          const rk = edge.risk_level in RISK_MARKER_FILL ? edge.risk_level : 'unknown'
          const strokeColor = RISK_STROKE[rk] ?? RISK_STROKE.unknown
          return (
            <path
              key={i}
              d={edgePath(sp.x, sp.y, dp.x, dp.y, r1, r2)}
              fill="none"
              stroke={strokeColor}
              strokeWidth={strokeW}
              strokeOpacity={0.55}
              strokeDasharray={dash}
              markerEnd={`url(#arrow-${rk})`}
            >
              <title>{`${edge.source_url} → ${edge.dest_url} · ${edge.flow_count} flow${edge.flow_count !== 1 ? 's' : ''} · risk: ${edge.risk_level}${edge.dest_has_net_egress ? ' · net_egress' : ''}`}</title>
            </path>
          )
        })}

        {/* ── Nodes ── */}
        {positions.map(({ node, x, y }) => {
          const r         = nodeRadius(node.call_count)
          const isSelected = selectedUrl === node.url
          const rk        = node.risk_level in RISK_FILL ? node.risk_level : 'unknown'
          const fill      = RISK_FILL[rk]
          const strokeColor = isSelected ? '#fff' : (RISK_STROKE[rk] ?? RISK_STROKE.unknown)
          const strokeW   = isSelected ? 2.5 : (node.circuit_broken ? 3 : 1.5)
          const strokeDash = !node.in_directory ? '5 3' : undefined

          return (
            <g
              key={node.url}
              transform={`translate(${x},${y})`}
              onClick={(e) => { e.stopPropagation(); onSelect(isSelected ? null : node.url) }}
              style={{ cursor: 'pointer' }}
              role="button"
              aria-label={node.name}
              aria-pressed={isSelected}
            >
              {/* Selection glow */}
              {isSelected && (
                <circle r={r + 6} fill="rgba(255,255,255,0.08)" />
              )}

              {/* Circuit broken ring */}
              {node.circuit_broken && !isSelected && (
                <circle r={r + 4} fill="none" stroke="#ef4444" strokeWidth={2} strokeOpacity={0.6} />
              )}

              {/* Node circle */}
              <circle
                r={r}
                fill={fill}
                stroke={strokeColor}
                strokeWidth={strokeW}
                strokeDasharray={strokeDash}
              />

              {/* Icons: circuit broken + quarantined */}
              {node.circuit_broken && (
                <text y={-r - 6} textAnchor="middle" style={{ fontSize: 12, userSelect: 'none' }}>⚡</text>
              )}
              {node.is_quarantined && (
                <text y={-r - (node.circuit_broken ? 22 : 6)} textAnchor="middle" style={{ fontSize: 12, userSelect: 'none' }}>⛔</text>
              )}

              {/* Recent threats dot */}
              {node.recent_threats.length > 0 && (
                <circle cx={r * 0.68} cy={-r * 0.68} r={6} fill="#f97316" stroke="#0d1117" strokeWidth={1.5} />
              )}

              {/* Policy blocked dot */}
              {node.policy_blocked && (
                <circle cx={-r * 0.68} cy={-r * 0.68} r={6} fill="#8b5cf6" stroke="#0d1117" strokeWidth={1.5} />
              )}

              {/* Node label */}
              <text
                y={r + 16}
                textAnchor="middle"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  fill: 'rgba(255,255,255,0.70)',
                  letterSpacing: '0.02em',
                  userSelect: 'none',
                }}
              >
                {truncate(node.name, 18)}
              </text>

              {/* Score label inside circle */}
              {node.security_score !== null && (
                <text
                  textAnchor="middle"
                  dy="0.35em"
                  style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fill: 'rgba(255,255,255,0.55)', userSelect: 'none' }}
                >
                  {node.security_score}
                </text>
              )}

              <title>{`${node.name}\n${node.url}\nRisk: ${node.risk_level}${node.circuit_broken ? '\n⚡ Circuit breaker tripped' : ''}${node.is_quarantined ? '\n⛔ Quarantined' : ''}`}</title>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
