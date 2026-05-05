'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { getMood } from './types'
import type { Vec2, FlightState, MovementTarget, AstronautRenderState } from './types'

function lerp(a: number, b: number, t: number) { return a + (b - a) * t }
function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)) }
function dist(a: Vec2, b: Vec2) { return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2) }

// Quadratic bezier
function bezier(t: number, p0: Vec2, p1: Vec2, p2: Vec2): Vec2 {
  const mt = 1 - t
  return {
    x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
    y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y,
  }
}

function getHomePos(): Vec2 {
  if (typeof window === 'undefined') return { x: 65, y: 500 }
  return { x: 65, y: window.innerHeight - 220 }
}

const LARRY_W = 90
const LARRY_H = 117

// ─── Target discovery ─────────────────────────────────────────────────────────
// Queries the live DOM each call — no caching.
// Root cause of "stuck on left": Glass component doesn't spread data-* props,
// so data-astro-anchor on <Glass> cards never reaches the DOM. We query by
// .glass class directly instead, plus headings, moon, and fixed space targets.

function discoverTargets(): MovementTarget[] {
  if (typeof document === 'undefined') return []
  const vw = window.innerWidth
  const vh = window.innerHeight
  const seen = new Set<string>()
  const out:  MovementTarget[] = []

  function add(t: MovementTarget) {
    if (seen.has(t.id)) return
    seen.add(t.id)
    // Clamp so Larry never spawns off-screen
    out.push({
      ...t,
      x: clamp(t.x, 10, vw - LARRY_W - 10),
      y: clamp(t.y, 10, vh - LARRY_H - 10),
    })
  }

  // 1. data-astro-anchor elements (sidebar nav links — these actually reach the DOM)
  document.querySelectorAll<HTMLElement>('[data-astro-anchor]').forEach(el => {
    const r = el.getBoundingClientRect()
    if (r.width === 0 && r.height === 0) return
    add({
      id:   el.dataset.astroAnchor ?? `anc-${Math.random()}`,
      x:    r.left + r.width  / 2 - LARRY_W / 2,
      y:    r.top  - LARRY_H,
      kind: 'element',
    })
  })

  // 2. Glass cards (queried by class — bypasses the Glass component's missing ...rest spread)
  document.querySelectorAll<HTMLElement>('.glass').forEach((el, i) => {
    const r = el.getBoundingClientRect()
    if (r.width < 150 || r.height < 60) return    // skip small inline glass
    if (r.top < -100 || r.top > vh + 100) return  // skip off-screen
    add({
      id:   `glass-${i}-${Math.round(r.left)}-${Math.round(r.top)}`,
      x:    r.left + r.width  / 2 - LARRY_W / 2,
      y:    r.top  - LARRY_H,
      kind: 'element',
    })
  })

  // 3. Headings
  document.querySelectorAll<HTMLElement>('h1, h2, h3').forEach((el, i) => {
    const r = el.getBoundingClientRect()
    if (r.width === 0 || r.height === 0) return
    if (r.top < -100 || r.top > vh + 100) return
    add({
      id:   `h-${i}-${Math.round(r.top)}`,
      x:    r.left + r.width  / 2 - LARRY_W / 2,
      y:    r.top  - LARRY_H,
      kind: 'element',
    })
  })

  // 4. Moon (ParallaxStarField adds id="larry-moon" to the moon div)
  const moon = document.getElementById('larry-moon')
  if (moon) {
    const r = moon.getBoundingClientRect()
    add({
      id:    'moon',
      x:     r.left + r.width  / 2 - LARRY_W / 2,
      y:     r.top  + r.height / 2 - LARRY_H / 2, // center on moon face
      kind:  'moon',
      scale: 0.8,
    })
  }

  // 5. Fixed space targets — open sky positions in the main content area.
  // mainLeft ≈ sidebar width + buffer so targets land in the content column.
  const ml = 240
  const spacePts: Array<[string, number, number]> = [
    ['space-tl', ml + (vw - ml) * 0.10, vh * 0.08],
    ['space-tr', ml + (vw - ml) * 0.75, vh * 0.07],
    ['space-bc', ml + (vw - ml) * 0.45, vh * 0.70],
    ['space-mc', ml + (vw - ml) * 0.55, vh * 0.36],
  ]
  for (const [id, x, y] of spacePts) {
    add({ id, x, y, kind: 'space' })
  }

  return out
}

// ─── Idle animation roster ────────────────────────────────────────────────────
const IDLE_ROSTER = [
  { cls: 'astro-idle-wave',    duration: 1600 },
  { cls: 'astro-idle-thumbs',  duration: 2400 },
  { cls: 'astro-idle-stretch', duration: 2700 },
  { cls: 'astro-idle-look',    duration: 4400 },
] as const

export interface BrainProps {
  usagePercent: number
  apiCallCount: number
  founderBadge: boolean
  onTick?: (cursor: Vec2) => void
}

export interface BrainResult {
  state: AstronautRenderState
  flightState: FlightState
  flamesActive: boolean
  pos: Vec2
  bobY: number
  scale: number
  idleAnimClass: string
  flightAnimClass: string
  nozzleLeft: Vec2
  nozzleRight: Vec2
  onClickAstronaut: () => void
  showSparkBurst: boolean
  onSparkDone: () => void
  showDustCloud: boolean
  onDustDone: () => void
  dustPos: Vec2
}

export function useAstronautBrain({
  usagePercent,
  apiCallCount,
  founderBadge,
  onTick,
}: BrainProps): BrainResult {
  const mood = getMood(usagePercent)

  // ── Position ──
  const posRef   = useRef<Vec2>(getHomePos())
  const [renderPos, setRenderPos] = useState<Vec2>(getHomePos())

  // ── Flight state ──
  const [flightState,     setFlightState]     = useState<FlightState>('idle')
  const [flightAnimClass, setFlightAnimClass] = useState<string>('')
  const flightStateRef = useRef<FlightState>('idle')

  // ── Idle animation ──
  const [idleAnimClass, setIdleAnimClass] = useState<string>('base')
  const idleAnimTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Head tracking ──
  const cursorRef  = useRef<Vec2>({ x: 0, y: 0 })
  const headTgtRef = useRef({ rx: 0, ry: 0 })
  const headCurRef = useRef({ rx: 0, ry: 0 })
  const [headRot,  setHeadRot]  = useState({ rx: 0, ry: 0 })

  // ── Eye blink ──
  const [eyeVisible, setEyeVisible] = useState(true)

  // ── Idle bob ──
  const bobRef = useRef(0)
  const [bobY, setBobY] = useState(0)

  // ── Arc flight ──
  const arcRef = useRef<{
    p0: Vec2; p1: Vec2; p2: Vec2; duration: number; startTime: number
  } | null>(null)

  // ── Lean ──
  const [isMovingRight, setIsMovingRight] = useState(true)

  // ── Flames ──
  const [flamesActive, setFlamesActive] = useState(false)

  // ── Scale (moon = 0.8x) ──
  const [renderScale,   setRenderScale]   = useState(1.0)
  const targetScaleRef = useRef(1.0)

  // ── Particles ──
  const [showSparkBurst, setShowSparkBurst] = useState(false)
  const [showDustCloud,  setShowDustCloud]  = useState(false)

  // ── API call tracking ──
  const prevApiCount = useRef(apiCallCount)

  // ── rAF ──
  const rafRef = useRef<number>(0)

  // ── Wander timer ──
  const wanderTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Idle animation cycling ────────────────────────────────────────────────
  // delay param: first call at mount uses 5s so Larry does something quickly.
  // Recursive calls (after each anim completes) use the default 8-12s cadence.

  function scheduleIdleAnim(initialDelay?: number) {
    if (idleAnimTimer.current) clearTimeout(idleAnimTimer.current)
    const delay = initialDelay ?? (8000 + Math.random() * 4000)
    idleAnimTimer.current = setTimeout(() => {
      if (flightStateRef.current !== 'idle') {
        scheduleIdleAnim()
        return
      }
      const pick = IDLE_ROSTER[Math.floor(Math.random() * IDLE_ROSTER.length)]
      setIdleAnimClass(pick.cls)
      idleAnimTimer.current = setTimeout(() => {
        setIdleAnimClass('base')
        scheduleIdleAnim()
      }, pick.duration)
    }, delay)
  }

  // ── Wander + flight ──────────────────────────────────────────────────────

  // delay: explicit ms, or omitted for the default 8-14s roaming interval
  function scheduleWander(delay?: number) {
    if (wanderTimer.current) clearTimeout(wanderTimer.current)
    const d = delay ?? (8000 + Math.random() * 6000)
    wanderTimer.current = setTimeout(() => {
      if (flightStateRef.current !== 'idle') { scheduleWander(); return }
      const targets = discoverTargets()
      if (targets.length === 0) { scheduleWander(); return }
      const cur  = posRef.current
      // Prefer targets more than 200px away so every flight is visually meaningful
      const far  = targets.filter(t => dist(t, cur) > 200)
      const pool = far.length > 0 ? far : targets
      const pick = pool[Math.floor(Math.random() * pool.length)]
      flyTo(pick)
    }, d)
  }

  function flyTo(target: MovementTarget) {
    const p0 = { ...posRef.current }
    const p2 = { x: target.x, y: target.y }
    const p1: Vec2 = {
      x: (p0.x + p2.x) / 2,
      y: Math.min(p0.y, p2.y) - 60 - Math.abs(p0.x - p2.x) * 0.15,
    }
    const duration = clamp(dist(p0, p2) * 1.8, 800, 2400)

    // Capture the target scale so it can be applied on landing
    targetScaleRef.current = target.scale ?? 1.0

    setFlightAnimClass('astro-flight-launch')
    setIdleAnimClass('base')
    if (idleAnimTimer.current) clearTimeout(idleAnimTimer.current)

    setTimeout(() => {
      arcRef.current = { p0, p1, p2, duration, startTime: performance.now() }
      flightStateRef.current = 'flying'
      setFlightState('flying')
      setFlightAnimClass('astro-flight-glide')
      setFlamesActive(true)
      setIsMovingRight(p2.x > p0.x)
    }, 280)
  }

  // ── Mouse tracking ──
  useEffect(() => {
    function onMove(e: MouseEvent) {
      cursorRef.current = { x: e.clientX, y: e.clientY }
      if (flightStateRef.current === 'idle') {
        const cx = posRef.current.x + 45
        const cy = posRef.current.y + 58
        headTgtRef.current = {
          rx: clamp((e.clientX - cx) / 400 * 14, -14, 14),
          ry: clamp((e.clientY - cy) / 400 *  9,  -9,  9),
        }
      }
    }
    window.addEventListener('mousemove', onMove, { passive: true })
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  // ── Blink ──
  useEffect(() => {
    let handle: ReturnType<typeof setTimeout>
    function scheduleBlink() {
      handle = setTimeout(() => {
        setEyeVisible(false)
        setTimeout(() => { setEyeVisible(true); scheduleBlink() }, 80)
      }, 4000 + Math.random() * 2500)
    }
    scheduleBlink()
    return () => clearTimeout(handle)
  }, [])

  // ── API call bounce ──
  useEffect(() => {
    if (apiCallCount !== prevApiCount.current && apiCallCount > 0) {
      prevApiCount.current = apiCallCount
      bobRef.current -= 12
    }
  }, [apiCallCount])

  // ── Main rAF loop ──
  useEffect(() => {
    function tick(now: number) {
      // Arc flight
      const arc = arcRef.current
      if (arc && flightStateRef.current === 'flying') {
        const t = Math.min((now - arc.startTime) / arc.duration, 1)
        const p = bezier(t, arc.p0, arc.p1, arc.p2)
        posRef.current = p

        if (t >= 1) {
          arcRef.current = null
          flightStateRef.current = 'landing'
          setFlightState('landing')
          setFlightAnimClass('astro-flight-land')
          setFlamesActive(false)
          setRenderPos({ ...posRef.current })
          setTimeout(() => {
            flightStateRef.current = 'idle'
            setFlightState('idle')
            setFlightAnimClass('')
            setRenderScale(targetScaleRef.current)
            scheduleWander()
            scheduleIdleAnim()
          }, 500)
        }
        setRenderPos({ ...posRef.current })
      }

      // Idle bob
      if (flightStateRef.current === 'idle') {
        bobRef.current = lerp(bobRef.current, 0, 0.08)
        setBobY(Math.sin(now / 1600) * 4 + bobRef.current)
      }

      // Head tracking lerp
      headCurRef.current.rx = lerp(headCurRef.current.rx, headTgtRef.current.rx, 0.05)
      headCurRef.current.ry = lerp(headCurRef.current.ry, headTgtRef.current.ry, 0.05)
      const hr = headCurRef.current
      setHeadRot(prev =>
        Math.abs(prev.rx - hr.rx) > 0.04 || Math.abs(prev.ry - hr.ry) > 0.04
          ? { rx: hr.rx, ry: hr.ry }
          : prev
      )

      onTick?.(cursorRef.current)
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    // 800ms initial delay lets the page hydrate and render DOM targets before first query
    scheduleWander(800)
    // 5s initial delay so Larry does something visually interesting quickly on first load
    scheduleIdleAnim(5000)

    return () => {
      cancelAnimationFrame(rafRef.current)
      if (wanderTimer.current)   clearTimeout(wanderTimer.current)
      if (idleAnimTimer.current) clearTimeout(idleAnimTimer.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Click ──
  const onClickAstronaut = useCallback(() => setShowSparkBurst(true), [])
  const onSparkDone      = useCallback(() => setShowSparkBurst(false), [])
  const onDustDone       = useCallback(() => setShowDustCloud(false), [])

  const state: AstronautRenderState = {
    pos:          renderPos,
    flightState,
    heading:      isMovingRight ? 15 : -15,
    isMovingRight,
    eyeVisible,
    mood,
    founderBadge,
    headRotX:     headRot.ry * -0.5,
    headRotY:     headRot.rx,
    flamesActive,
  }

  return {
    state,
    flightState,
    flamesActive,
    pos: renderPos,
    bobY,
    scale: renderScale,
    idleAnimClass,
    flightAnimClass,
    nozzleLeft:  { x: renderPos.x + 32, y: renderPos.y + 86 },
    nozzleRight: { x: renderPos.x + 59, y: renderPos.y + 86 },
    onClickAstronaut,
    showSparkBurst,
    onSparkDone,
    showDustCloud,
    onDustDone,
    dustPos: { x: renderPos.x + 45, y: renderPos.y + 120 },
  }
}
