'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

export type Mood = 'happy' | 'neutral' | 'worried' | 'depleted'

export interface AstronautPetProps {
  usagePercent: number    // 0–100 → mood
  apiCallCount?: number   // increment triggers bounce
  founderBadge?: boolean  // gold star on helmet
}

interface Particle {
  id: number
  angle: number  // degrees
  dist: number   // px
}

// ─── Pure helpers ─────────────────────────────────────────────────────────────

export function getMood(pct: number): Mood {
  if (pct <= 60)  return 'happy'
  if (pct <= 85)  return 'neutral'
  if (pct < 100)  return 'worried'
  return 'depleted'
}

const TOOLTIP: Record<Mood, string> = {
  happy:    'All systems nominal ✓',
  neutral:  'Watch your calls...',
  worried:  'Getting close! 👀',
  depleted: 'Out of fuel... upgrade?',
}

const VISOR: Record<Mood, { top: string; mid: string; bot: string }> = {
  happy:    { top: '#3de08a', mid: '#00c472', bot: '#005a35' },
  neutral:  { top: '#2acc72', mid: '#00a85e', bot: '#004d2a' },
  worried:  { top: '#fcd34d', mid: '#f59e0b', bot: '#b45309' },
  depleted: { top: '#f87171', mid: '#ef4444', bot: '#991b1b' },
}

const IDLE_CLASS: Record<Mood, string> = {
  happy:    'astro-float',
  neutral:  'astro-float-neutral',
  worried:  'astro-float-worried',
  depleted: '',
}

function lerp(a: number, b: number, t: number) { return a + (b - a) * t }
function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)) }

// ─── SVG ──────────────────────────────────────────────────────────────────────

function AstronautSVG({
  mood,
  founderBadge,
  eyeVisible,
}: {
  mood: Mood
  founderBadge?: boolean
  eyeVisible: boolean
}) {
  const vc = VISOR[mood]
  const gid = `vg-${mood}`        // visor gradient id
  const sid = 'vs'                 // specular id (mood-independent shape)
  const depleted = mood === 'depleted'
  const glowAlpha = depleted ? 0.15 : 0.40

  return (
    <svg
      width={80} height={80} viewBox="0 0 80 80"
      fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ filter: `drop-shadow(0 0 6px rgba(0,196,114,${glowAlpha}))` }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gid} x1="40" y1="16" x2="40" y2="38" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor={vc.top} />
          <stop offset="45%"  stopColor={vc.mid} />
          <stop offset="100%" stopColor={vc.bot} />
        </linearGradient>
        <radialGradient id={sid} cx="38%" cy="28%" r="50%">
          <stop offset="0%"   stopColor="white" stopOpacity={0.45} />
          <stop offset="100%" stopColor="white" stopOpacity={0} />
        </radialGradient>
      </defs>

      {/* ── Legs ── */}
      <rect x={28} y={62} width={10} height={14} rx={4} fill="#1a1f2e" />
      <rect x={42} y={62} width={10} height={14} rx={4} fill="#1a1f2e" />

      {/* ── Body ── */}
      <rect x={22} y={42} width={36} height={26} rx={11} fill="#1a1f2e" />
      {/* Chest panel */}
      <rect x={32} y={48} width={16} height={10} rx={3}
        fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.10)" strokeWidth={0.5} />
      <circle cx={40} cy={53} r={2} fill="rgba(0,196,114,0.55)" />

      {/* ── Arms — droopy when depleted ── */}
      <rect
        x={depleted ? 13 : 11}
        y={depleted ? 50 : 45}
        width={12} height={10} rx={5} fill="#1a1f2e"
        transform={depleted ? 'rotate(20 19 55)' : undefined}
      />
      <rect
        x={depleted ? 55 : 57}
        y={depleted ? 50 : 45}
        width={12} height={10} rx={5} fill="#1a1f2e"
        transform={depleted ? 'rotate(-20 61 55)' : undefined}
      />

      {/* ── Neck ── */}
      <rect x={35} y={40} width={10} height={6} rx={3} fill="#1a1f2e" />

      {/* ── Helmet ── */}
      <circle cx={40} cy={26} r={20} fill="#1a1f2e"
        stroke="rgba(255,255,255,0.15)" strokeWidth={1.5} />
      {/* Top specular arc */}
      <circle cx={40} cy={26} r={20} fill="none"
        stroke="rgba(255,255,255,0.08)" strokeWidth={5}
        strokeDasharray="30 100" strokeDashoffset="-5" />

      {/* ── Visor ── */}
      <rect x={28} y={17} width={24} height={20} rx={10}
        fill={`url(#${gid})`} stroke="rgba(255,255,255,0.22)" strokeWidth={0.75} />
      <rect x={28} y={17} width={24} height={20} rx={10}
        fill={`url(#${sid})`} />

      {/* ── Eyes ── */}
      <circle
        cx={35} cy={26}
        r={eyeVisible ? 2.2 : 0.3}
        fill="rgba(255,255,255,0.90)"
        style={{ transition: 'r 80ms linear' }}
      />
      <circle
        cx={45} cy={26}
        r={eyeVisible ? 2.2 : 0.3}
        fill="rgba(255,255,255,0.90)"
        style={{ transition: 'r 80ms linear' }}
      />
      {eyeVisible && (
        <>
          <circle cx={35.5} cy={26.4} r={1} fill="rgba(0,40,20,0.7)" />
          <circle cx={45.5} cy={26.4} r={1} fill="rgba(0,40,20,0.7)" />
        </>
      )}

      {/* ── Founder gold star ── */}
      {founderBadge && (
        <g transform="translate(54,8) scale(0.55)">
          <polygon
            points="7,0 8.9,5.8 15,5.8 9.9,9.4 11.8,15.2 7,11.6 2.2,15.2 4.1,9.4 -1,5.8 5.1,5.8"
            fill="#fbbf24" stroke="#f59e0b" strokeWidth={0.8}
          />
        </g>
      )}
    </svg>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AstronautPet({
  usagePercent,
  apiCallCount = 0,
  founderBadge,
}: AstronautPetProps) {
  const mood     = getMood(usagePercent)
  const depleted = mood === 'depleted'

  // ── React state ──
  const [eyeVisible,   setEyeVisible]   = useState(true)
  const [showTooltip,  setShowTooltip]  = useState(false)
  const [flipping,     setFlipping]     = useState(false)
  const [bouncing,     setBouncing]     = useState(false)
  const [showApiStar,  setShowApiStar]  = useState(false)
  const [particles,    setParticles]    = useState<Particle[]>([])

  // ── Refs for perf-sensitive loops ──
  const containerRef  = useRef<HTMLDivElement>(null)
  const trackDivRef   = useRef<HTMLDivElement>(null)
  const rafRef        = useRef<number>(0)
  const tgt           = useRef({ x: 0, y: 0 })
  const cur           = useRef({ x: 0, y: 0 })
  const prevCount     = useRef(apiCallCount)

  // ── Blink ──
  useEffect(() => {
    let handle: ReturnType<typeof setTimeout>
    function scheduleBlink() {
      handle = setTimeout(() => {
        setEyeVisible(false)
        setTimeout(() => {
          setEyeVisible(true)
          scheduleBlink()
        }, 80)
      }, 4000 + Math.random() * 2000)
    }
    scheduleBlink()
    return () => clearTimeout(handle)
  }, [])

  // ── API call bounce ──
  useEffect(() => {
    if (apiCallCount !== prevCount.current) {
      prevCount.current = apiCallCount
      if (apiCallCount > 0) {
        setBouncing(true)
        setShowApiStar(true)
        setTimeout(() => setBouncing(false), 450)
        setTimeout(() => setShowApiStar(false), 1100)
      }
    }
  }, [apiCallCount])

  // ── Mouse tracking rAF loop (skipped when depleted) ──
  useEffect(() => {
    if (depleted) {
      if (trackDivRef.current) trackDivRef.current.style.transform = ''
      return
    }

    function onMove(e: MouseEvent) {
      const el = containerRef.current
      if (!el) return
      const r  = el.getBoundingClientRect()
      const cx = r.left + r.width  / 2
      const cy = r.top  + r.height / 2
      tgt.current = {
        x: clamp((e.clientX - cx) / 400 * 15, -15, 15),
        y: clamp((e.clientY - cy) / 400 * 10, -10, 10),
      }
    }

    window.addEventListener('mousemove', onMove, { passive: true })

    function tick() {
      cur.current.x = lerp(cur.current.x, tgt.current.x, 0.05)
      cur.current.y = lerp(cur.current.y, tgt.current.y, 0.05)
      if (trackDivRef.current) {
        const rx = cur.current.x.toFixed(2)
        const ry = (cur.current.y * -0.5).toFixed(2)
        trackDivRef.current.style.transform =
          `perspective(300px) rotateY(${rx}deg) rotateX(${ry}deg)`
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)

    return () => {
      window.removeEventListener('mousemove', onMove)
      cancelAnimationFrame(rafRef.current)
    }
  }, [depleted])

  // ── Click handler ──
  const handleClick = useCallback(() => {
    if (flipping) return
    setFlipping(true)
    const count = 6 + Math.floor(Math.random() * 3)
    setParticles(
      Array.from({ length: count }, (_, i) => ({
        id:    Date.now() + i,
        angle: (360 / count) * i + Math.random() * 20,
        dist:  22 + Math.random() * 18,
      }))
    )
    setTimeout(() => { setFlipping(false); setParticles([]) }, 650)
  }, [flipping])

  // ── Derived animation ──
  const animStyle: React.CSSProperties = flipping
    ? { animation: 'dash-flip 400ms ease-in-out forwards' }
    : bouncing
    ? { animation: 'dash-bounce 450ms cubic-bezier(0.36,0.07,0.19,0.97) forwards' }
    : {}

  const moodTransform =
    mood === 'worried'  ? 'rotate(-5deg)'   :
    mood === 'depleted' ? 'translateY(6px)' : ''

  return (
    <div
      ref={containerRef}
      role="img"
      aria-label={`Astronaut co-pilot: ${TOOLTIP[mood]}`}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 4, paddingBottom: 8, position: 'relative',
        width: 80, margin: '0 auto',
        cursor: 'pointer', userSelect: 'none',
      }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onClick={handleClick}
    >

      {/* ── Tooltip ── */}
      {showTooltip && (
        <div style={{
          position: 'absolute', bottom: 'calc(100% + 6px)', left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(5,6,13,0.94)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 8, padding: '5px 10px',
          fontFamily: 'var(--font-mono)', fontSize: 11,
          color: 'var(--ink-soft)', whiteSpace: 'nowrap',
          pointerEvents: 'none', zIndex: 20,
          boxShadow: '0 4px 14px rgba(0,0,0,0.5)',
        }}>
          {TOOLTIP[mood]}
          <div style={{
            position: 'absolute', top: '100%', left: '50%',
            transform: 'translateX(-50%)',
            borderLeft: '5px solid transparent',
            borderRight: '5px solid transparent',
            borderTop: '5px solid rgba(5,6,13,0.94)',
          }} />
        </div>
      )}

      {/* ── API call ✓ floats up ── */}
      {showApiStar && (
        <div style={{
          position: 'absolute', top: 0, left: '50%',
          animation: 'dash-api-star 1100ms ease-out forwards',
          color: '#00c472', fontSize: 14, fontWeight: 700,
          pointerEvents: 'none', zIndex: 15,
        }}>
          ✓
        </div>
      )}

      {/* ── Click burst particles ── */}
      {particles.map(p => (
        <div
          key={p.id}
          style={{
            position: 'absolute', top: '40%', left: '50%',
            width: 5, height: 5, borderRadius: '50%',
            background: '#00c472', pointerEvents: 'none',
            animation: 'dash-particle 620ms ease-out forwards',
            '--angle': `${p.angle}deg`,
            '--dist': `${p.dist}px`,
          } as React.CSSProperties}
        />
      ))}

      {/* ── Astronaut layers ── */}
      {/* Layer 1: persistent mood offset */}
      <div style={{ transform: moodTransform, transformOrigin: 'center bottom' }}>
        {/* Layer 2: idle/reactive animation */}
        <div
          className={flipping || bouncing ? '' : IDLE_CLASS[mood]}
          style={{ ...animStyle, transformOrigin: 'center' }}
        >
          {/* Layer 3: mouse tracking (direct DOM, no re-render) */}
          <div ref={trackDivRef} style={{ willChange: 'transform' }}>
            <AstronautSVG
              mood={mood}
              founderBadge={founderBadge}
              eyeVisible={eyeVisible}
            />
          </div>
        </div>
      </div>

      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: 10,
        color: 'var(--ink-faint)', letterSpacing: '0.08em',
      }}>
        your co-pilot
      </span>
    </div>
  )
}
