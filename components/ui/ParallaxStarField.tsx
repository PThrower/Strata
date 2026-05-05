'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Vec2 } from './astronaut/types'

// ─── Star data ────────────────────────────────────────────────────────────────

interface Star {
  x: number  // 0–1 (fraction of canvas width)
  y: number  // 0–1
  r: number
  opacity: number
  twinkleOffset: number  // phase offset for opacity animation
}

function makeStars(count: number, minR: number, maxR: number): Star[] {
  return Array.from({ length: count }, () => ({
    x:             Math.random(),
    y:             Math.random(),
    r:             minR + Math.random() * (maxR - minR),
    opacity:       0.35 + Math.random() * 0.55,
    twinkleOffset: Math.random() * Math.PI * 2,
  }))
}

// Seeded once at module load so stars don't re-randomize on re-render
const LAYER1_STARS = makeStars(160, 0.5, 1.0)   // many tiny
const LAYER2_STARS = makeStars(70,  0.8, 1.4)   // medium
const LAYER3_STARS = makeStars(25,  1.2, 2.0)   // sparse, bright

function drawStars(
  ctx: CanvasRenderingContext2D,
  stars: Star[],
  w: number,
  h: number,
  offsetX: number,
  offsetY: number,
  t: number,
) {
  ctx.clearRect(0, 0, w, h)
  for (const s of stars) {
    // Twinkle: slow opacity oscillation, 3-6s period per star
    const twinkle = 0.85 + 0.15 * Math.sin(t / 3000 + s.twinkleOffset)
    const alpha = s.opacity * twinkle
    ctx.beginPath()
    ctx.arc(
      (s.x * w + offsetX + w * 5) % w,  // wrap around with large modulus
      (s.y * h + offsetY + h * 5) % h,
      s.r,
      0, Math.PI * 2,
    )
    ctx.fillStyle = `rgba(255,255,255,${alpha})`
    ctx.fill()
  }
}

// ─── Moon ────────────────────────────────────────────────────────────────────

interface MoonProps {
  offsetX: number
  offsetY: number
}

function Moon({ offsetX, offsetY }: MoonProps) {
  const BASE_TOP  = 60
  const BASE_RIGHT = 120

  return (
    <div style={{
      position: 'fixed',
      top:  BASE_TOP  + offsetY,
      right: BASE_RIGHT - offsetX,
      width:  180,
      height: 180,
      borderRadius: '50%',
      background: 'radial-gradient(circle at 38% 35%, #e8ecf0 0%, #c8cfd8 40%, #9aa0ac 75%, #6a7080 100%)',
      boxShadow: [
        '0 0 30px 10px rgba(200,210,230,0.15)',
        '0 0 80px 30px rgba(200,210,230,0.08)',
        'inset -8px -8px 20px rgba(0,0,0,0.3)',
      ].join(', '),
      pointerEvents: 'none',
      zIndex: -1,
      opacity: 0.55,
    }}>
      {/* Craters */}
      <div style={{ position: 'absolute', top: 38,  left: 52,  width: 28, height: 28, borderRadius: '50%', background: 'rgba(80,90,110,0.25)', boxShadow: 'inset 2px 2px 6px rgba(0,0,0,0.2)' }} />
      <div style={{ position: 'absolute', top: 90,  left: 28,  width: 18, height: 18, borderRadius: '50%', background: 'rgba(80,90,110,0.20)', boxShadow: 'inset 1px 1px 4px rgba(0,0,0,0.18)' }} />
      <div style={{ position: 'absolute', top: 55,  left: 105, width: 22, height: 22, borderRadius: '50%', background: 'rgba(80,90,110,0.18)', boxShadow: 'inset 2px 2px 5px rgba(0,0,0,0.15)' }} />
      <div style={{ position: 'absolute', top: 110, left: 78,  width: 14, height: 14, borderRadius: '50%', background: 'rgba(80,90,110,0.15)', boxShadow: 'inset 1px 1px 3px rgba(0,0,0,0.12)' }} />
    </div>
  )
}

// ─── Canvas layer ─────────────────────────────────────────────────────────────

interface StarLayerProps {
  stars: Star[]
  offsetX: number
  offsetY: number
  t: number
  zIndex: number
}

function StarLayer({ stars, offsetX, offsetY, t, zIndex }: StarLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const w = canvas.width
    const h = canvas.height
    drawStars(ctx, stars, w, h, offsetX, offsetY, t)
  })

  return (
    <canvas
      ref={canvasRef}
      width={typeof window !== 'undefined' ? window.innerWidth  : 1920}
      height={typeof window !== 'undefined' ? window.innerHeight : 1080}
      style={{
        position: 'fixed', inset: 0,
        width: '100vw', height: '100vh',
        pointerEvents: 'none',
        zIndex,
      }}
    />
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

function ParallaxField() {
  const cursorRef  = useRef<Vec2>({ x: 0, y: 0 })
  const lerpRef    = useRef<Vec2>({ x: 0, y: 0 })
  const rafRef     = useRef<number>(0)

  // Offsets per layer (lerped, small)
  const [offsets, setOffsets] = useState({
    l1: { x: 0, y: 0 },
    l2: { x: 0, y: 0 },
    l3: { x: 0, y: 0 },
    moon: { x: 0, y: 0 },
  })
  const [t, setT] = useState(0)

  useEffect(() => {
    function onMove(e: MouseEvent) {
      cursorRef.current = { x: e.clientX, y: e.clientY }
    }
    window.addEventListener('mousemove', onMove, { passive: true })

    let lastT = 0
    function tick(now: number) {
      if (lastT === 0) lastT = now

      // Prefer cursor from AstronautBrain if available (shared window var)
      const sharedCursor = (window as Window & { __astroCursor?: Vec2 }).__astroCursor
      if (sharedCursor) cursorRef.current = sharedCursor

      const cx = cursorRef.current.x
      const cy = cursorRef.current.y
      const vw = window.innerWidth  / 2
      const vh = window.innerHeight / 2
      // Offset from center
      const dx = cx - vw
      const dy = cy - vh

      // Lerp the overall cursor offset
      lerpRef.current.x = lerp(lerpRef.current.x, dx, 0.08)
      lerpRef.current.y = lerp(lerpRef.current.y, dy, 0.08)

      const lx = lerpRef.current.x
      const ly = lerpRef.current.y

      setOffsets({
        l1:   { x: lx * 0.01, y: ly * 0.01 },
        l2:   { x: lx * 0.02, y: ly * 0.02 },
        l3:   { x: lx * 0.04, y: ly * 0.04 },
        moon: { x: lx * 0.005, y: ly * 0.005 },
      })
      setT(now)

      lastT = now
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      window.removeEventListener('mousemove', onMove)
      cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return (
    <>
      <Moon offsetX={offsets.moon.x} offsetY={offsets.moon.y} />
      <StarLayer stars={LAYER1_STARS} offsetX={offsets.l1.x} offsetY={offsets.l1.y} t={t} zIndex={-2} />
      <StarLayer stars={LAYER2_STARS} offsetX={offsets.l2.x} offsetY={offsets.l2.y} t={t} zIndex={-2} />
      <StarLayer stars={LAYER3_STARS} offsetX={offsets.l3.x} offsetY={offsets.l3.y} t={t} zIndex={-1} />
    </>
  )
}

function lerp(a: number, b: number, t: number) { return a + (b - a) * t }

// ─── Portal-mounted export ────────────────────────────────────────────────────

export function ParallaxStarField() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return null
  return createPortal(<ParallaxField />, document.body)
}
