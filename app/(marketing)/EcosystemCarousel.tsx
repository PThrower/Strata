'use client'

import { useEffect, useRef } from 'react'
import { Glass } from '@/components/ui/glass'
import { LiveBadge } from '@/components/ui/live-badge'

const SVG_PROPS = {
  viewBox: '0 0 60 60',
  fill: 'none' as const,
  stroke: 'rgba(255,255,255,0.92)',
  strokeWidth: 2.2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  className: 'eco-mark',
  'aria-hidden': true,
}
const DOT = { fill: 'rgba(255,255,255,0.92)', stroke: 'none' }

type Eco = { slug: string; name: string; mark: React.ReactNode }

const ECOSYSTEMS: Eco[] = [
  {
    slug: 'cursor', name: 'Cursor',
    mark: <svg {...SVG_PROPS}><path d="M16 10 L16 46 L26 36 L32 50 L39 46 L33 32 L46 32 Z"/></svg>,
  },
  {
    slug: 'claudecode', name: 'Claude Code',
    mark: <svg {...SVG_PROPS}><polyline points="14,22 26,30 14,38"/><line x1="30" y1="38" x2="46" y2="38"/></svg>,
  },
  {
    slug: 'windsurf', name: 'Windsurf',
    mark: <svg {...SVG_PROPS}><line x1="30" y1="10" x2="30" y2="50"/><path d="M30 10 L10 32 L30 32 Z"/><path d="M8 44 Q18 34 28 38 Q38 42 50 28" strokeWidth="2"/></svg>,
  },
  {
    slug: 'copilot', name: 'Copilot',
    mark: <svg {...SVG_PROPS}><path d="M10 30 Q16 20 24 22 Q30 24 30 30 Q30 36 36 38 Q44 40 50 30"/><path d="M22 44 L30 30 L38 44"/><circle cx="30" cy="30" r="2.5" {...DOT}/></svg>,
  },
  {
    slug: 'cody', name: 'Cody',
    mark: <svg {...SVG_PROPS}><path d="M30 12 L22 12 C15 12 13 17 13 22 L13 26 C13 30 9 30 9 30 C9 30 13 30 13 34 L13 38 C13 43 15 48 22 48 L30 48"/><path d="M30 12 L38 12 C45 12 47 17 47 22 L47 26 C47 30 51 30 51 30 C51 30 47 30 47 34 L47 38 C47 43 45 48 38 48 L30 48"/></svg>,
  },
  {
    slug: 'perplexity', name: 'Perplexity',
    mark: <svg {...SVG_PROPS}><circle cx="30" cy="30" r="18"/><circle cx="30" cy="30" r="10"/><line x1="30" y1="12" x2="30" y2="20"/><line x1="30" y1="40" x2="30" y2="48"/><line x1="12" y1="30" x2="20" y2="30"/><line x1="40" y1="30" x2="48" y2="30"/><circle cx="30" cy="30" r="3" {...DOT}/></svg>,
  },
  {
    slug: 'youcom', name: 'You.com',
    mark: <svg {...SVG_PROPS}><circle cx="26" cy="26" r="15"/><line x1="37" y1="37" x2="51" y2="51" strokeWidth="2.8"/></svg>,
  },
  {
    slug: 'exa', name: 'Exa',
    mark: <svg {...SVG_PROPS}><line x1="10" y1="20" x2="50" y2="20"/><line x1="10" y1="30" x2="38" y2="30"/><line x1="10" y1="40" x2="50" y2="40"/><polyline points="40,24 50,30 40,36"/></svg>,
  },
  {
    slug: 'replicate', name: 'Replicate',
    mark: <svg {...SVG_PROPS}><rect x="8" y="8" width="26" height="26" rx="4"/><rect x="26" y="26" width="26" height="26" rx="4"/></svg>,
  },
  {
    slug: 'togetherai', name: 'Together AI',
    mark: <svg {...SVG_PROPS}><circle cx="30" cy="12" r="5"/><circle cx="12" cy="46" r="5"/><circle cx="48" cy="46" r="5"/><line x1="30" y1="17" x2="12" y2="41"/><line x1="30" y1="17" x2="48" y2="41"/><line x1="17" y1="46" x2="43" y2="46"/></svg>,
  },
  {
    slug: 'groq', name: 'Groq',
    mark: <svg {...SVG_PROPS}><line x1="10" y1="22" x2="50" y2="22"/><line x1="14" y1="30" x2="50" y2="30"/><line x1="10" y1="38" x2="46" y2="38"/><circle cx="50" cy="22" r="2" {...DOT}/><circle cx="50" cy="30" r="2" {...DOT}/><circle cx="46" cy="38" r="2" {...DOT}/></svg>,
  },
  {
    slug: 'fireworks', name: 'Fireworks',
    mark: <svg {...SVG_PROPS}><line x1="30" y1="8" x2="30" y2="52"/><line x1="8" y1="30" x2="52" y2="30"/><line x1="13" y1="13" x2="47" y2="47"/><line x1="47" y1="13" x2="13" y2="47"/><circle cx="30" cy="30" r="4" {...DOT}/></svg>,
  },
  {
    slug: 'manus', name: 'Manus',
    mark: <svg {...SVG_PROPS}><path d="M20 50 L20 28 Q20 22 24 22 Q28 22 28 28 L28 22 Q28 16 32 16 Q36 16 36 22 L36 28 Q36 20 40 20 Q44 20 44 26 L44 42 Q44 50 36 50 Z"/></svg>,
  },
  {
    slug: 'higgsfield', name: 'Higgsfield',
    mark: <svg {...SVG_PROPS}><rect x="8" y="14" width="44" height="32" rx="3"/><polygon points="24,22 24,38 42,30" stroke="rgba(255,255,255,0.92)" strokeWidth="2" fill="rgba(255,255,255,0.15)"/></svg>,
  },
  {
    slug: 'v0', name: 'v0',
    mark: <svg {...SVG_PROPS}><path d="M10 14 L30 46 L50 14"/><circle cx="30" cy="46" r="3" {...DOT}/></svg>,
  },
  {
    slug: 'bolt', name: 'Bolt',
    mark: <svg {...SVG_PROPS}><path d="M36 8 L16 34 L28 34 L22 52 L44 26 L32 26 L38 8 Z"/></svg>,
  },
  {
    slug: 'codex', name: 'Codex',
    mark: <svg {...SVG_PROPS}><polyline points="14,22 26,30 14,38"/><line x1="30" y1="38" x2="46" y2="38"/><circle cx="38" cy="22" r="4" {...DOT}/></svg>,
  },
]

function EcoTile({ name, mark }: Pick<Eco, 'name' | 'mark'>) {
  return (
    <Glass
      shimmer
      className="eco-card"
      style={{ padding: '28px 20px 22px', textAlign: 'center', width: 220, flexShrink: 0, display: 'block' }}
    >
      <span style={{
        display: 'block', width: 60, height: 60,
        margin: '6px auto 18px',
        filter: 'drop-shadow(0 4px 14px rgba(0,0,0,0.50))',
      }}>
        {mark}
      </span>
      <p style={{
        fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 400,
        letterSpacing: '-0.015em', margin: '0 0 14px', color: 'var(--ink)',
      }}>
        {name}
      </p>
      <LiveBadge />
    </Glass>
  )
}

export function EcosystemCarousel() {
  const tiles = [...ECOSYSTEMS, ...ECOSYSTEMS]
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const rows = el.querySelectorAll<HTMLElement>('.carousel-row')
    const observer = new IntersectionObserver(
      ([entry]) => {
        const state = entry.isIntersecting ? 'running' : 'paused'
        rows.forEach(row => { row.style.animationPlayState = state })
      },
      { threshold: 0 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        overflowX: 'hidden',
        overflowY: 'visible',
        maskImage: 'linear-gradient(to right, transparent 0%, black 6%, black 94%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 6%, black 94%, transparent 100%)',
      }}
    >
      {/* Row 1 — scrolls left */}
      <div
        className="carousel-row carousel-row-left"
        style={{ gap: 16, paddingRight: 16, marginBottom: 16, willChange: 'transform', transform: 'translate3d(0, 0, 0)' }}
      >
        {tiles.map((eco, i) => (
          <EcoTile key={`r1-${i}`} name={eco.name} mark={eco.mark} />
        ))}
      </div>
      {/* Row 2 — scrolls right */}
      <div
        className="carousel-row carousel-row-right"
        style={{ gap: 16, paddingRight: 16, willChange: 'transform', transform: 'translate3d(0, 0, 0)' }}
      >
        {tiles.map((eco, i) => (
          <EcoTile key={`r2-${i}`} name={eco.name} mark={eco.mark} />
        ))}
      </div>
    </div>
  )
}
