'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { getMood } from './types'
import type { Vec2, FlightState, MovementTarget, AstronautRenderState, Mood } from './types'

function lerp(a: number, b: number, t: number) { return a + (b - a) * t }
function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)) }
function dist(a: Vec2, b: Vec2) { return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2) }

// Quadratic bezier point — for smooth arc paths
function bezier(t: number, p0: Vec2, p1: Vec2, p2: Vec2): Vec2 {
  const mt = 1 - t
  return {
    x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
    y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y,
  }
}

// Home position: bottom of sidebar, centered
function getHomePos(): Vec2 {
  if (typeof window === 'undefined') return { x: 65, y: 500 }
  return { x: 110 - 45, y: window.innerHeight - 200 }
}

// Discover all data-astro-anchor elements in the DOM
function discoverTargets(): MovementTarget[] {
  if (typeof document === 'undefined') return []
  const els = document.querySelectorAll<HTMLElement>('[data-astro-anchor]')
  const targets: MovementTarget[] = []
  els.forEach(el => {
    const r = el.getBoundingClientRect()
    if (r.width === 0 && r.height === 0) return
    targets.push({
      id:  el.dataset.astroAnchor ?? el.id ?? Math.random().toString(),
      x:   r.left + r.width  / 2 - 45,  // top-left of astronaut (width=90)
      y:   r.top  + r.height / 2 - 55,  // top-left (height=110)
    })
  })
  return targets
}

export interface BrainProps {
  usagePercent: number
  apiCallCount: number
  founderBadge: boolean
  // Called each rAF — lets ParallaxStarField sync its loop
  onTick?: (cursor: Vec2) => void
}

export interface BrainResult {
  state: AstronautRenderState
  flightState: FlightState
  flamesActive: boolean
  pos: Vec2
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

  // ── Position (ref, not state — no re-render on every frame) ──
  const posRef = useRef<Vec2>(getHomePos())
  const [renderPos, setRenderPos] = useState<Vec2>(getHomePos())

  // ── Flight state ──
  const [flightState, setFlightState] = useState<FlightState>('idle')
  const flightStateRef = useRef<FlightState>('idle')

  // ── Head tracking ──
  const cursorRef    = useRef<Vec2>({ x: 0, y: 0 })
  const headTgtRef   = useRef({ rx: 0, ry: 0 })
  const headCurRef   = useRef({ rx: 0, ry: 0 })
  const [headRot, setHeadRot] = useState({ rx: 0, ry: 0 })

  // ── Eye blink ──
  const [eyeVisible, setEyeVisible] = useState(true)

  // ── Idle bob ──
  const bobRef = useRef(0)
  const [bobY, setBobY] = useState(0)

  // ── Arc flight ──
  const arcRef = useRef<{
    p0: Vec2; p1: Vec2; p2: Vec2; t: number; duration: number; startTime: number
  } | null>(null)

  // ── Lean (during flight) ──
  const [heading, setHeading]     = useState(0)
  const [isMovingRight, setIsMovingRight] = useState(true)

  // ── Flames ──
  const [flamesActive, setFlamesActive] = useState(false)

  // ── Particles ──
  const [showSparkBurst, setShowSparkBurst] = useState(false)
  const [showDustCloud,  setShowDustCloud]  = useState(false)
  const [dustPos,        setDustPos]        = useState<Vec2>({ x: 0, y: 0 })

  // ── API call bounce ──
  const prevApiCount = useRef(apiCallCount)

  // ── rAF handle ──
  const rafRef = useRef<number>(0)

  // ── Idle wander timer ──
  const wanderTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function scheduleWander() {
    if (wanderTimer.current) clearTimeout(wanderTimer.current)
    wanderTimer.current = setTimeout(() => {
      if (flightStateRef.current !== 'idle') {
        scheduleWander()
        return
      }
      const targets = discoverTargets()
      if (targets.length === 0) { scheduleWander(); return }
      // Pick a random target that isn't basically where we are
      const cur = posRef.current
      const far = targets.filter(t => dist(t, cur) > 80)
      const pick = far.length > 0
        ? far[Math.floor(Math.random() * far.length)]
        : targets[Math.floor(Math.random() * targets.length)]
      flyTo(pick)
    }, 8000 + Math.random() * 6000)  // every 8-14s
  }

  function flyTo(target: MovementTarget) {
    const p0 = { ...posRef.current }
    const p2 = { x: target.x, y: target.y }
    // Control point: midpoint elevated by ~60px for nice arc
    const p1: Vec2 = {
      x: (p0.x + p2.x) / 2,
      y: Math.min(p0.y, p2.y) - 60 - Math.abs(p0.x - p2.x) * 0.15,
    }
    const duration = clamp(dist(p0, p2) * 1.8, 800, 2400)  // 0.8–2.4s depending on distance
    arcRef.current = { p0, p1, p2, t: 0, duration, startTime: performance.now() }
    flightStateRef.current = 'flying'
    setFlightState('flying')
    setFlamesActive(true)
    setIsMovingRight(p2.x > p0.x)
    setHeading(p2.x > p0.x ? 15 : -15)  // lean toward destination
  }

  // ── Mouse move → update cursor ref ──
  useEffect(() => {
    function onMove(e: MouseEvent) {
      cursorRef.current = { x: e.clientX, y: e.clientY }
      const cx = posRef.current.x + 45
      const cy = posRef.current.y + 55
      const dx = e.clientX - cx
      const dy = e.clientY - cy
      if (flightStateRef.current === 'idle') {
        headTgtRef.current = {
          rx: clamp(dx / 400 * 14, -14, 14),
          ry: clamp(dy / 400 *  9, -9,   9),
        }
      }
    }
    window.addEventListener('mousemove', onMove, { passive: true })
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  // ── Blink timer ──
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
      // Small excited bob — handled via bobRef nudge
      bobRef.current -= 12
    }
  }, [apiCallCount])

  // ── Main rAF loop ──
  useEffect(() => {
    let t0 = performance.now()

    function tick(now: number) {
      const dt = now - t0
      t0 = now

      // ── Arc flight ──
      const arc = arcRef.current
      if (arc && flightStateRef.current === 'flying') {
        arc.t = Math.min((now - arc.startTime) / arc.duration, 1)
        const p = bezier(arc.t, arc.p0, arc.p1, arc.p2)
        posRef.current = p

        if (arc.t >= 1) {
          // Landing
          arcRef.current = null
          flightStateRef.current = 'landing'
          setFlightState('landing')
          setFlamesActive(false)
          setHeading(0)
          setDustPos({ x: posRef.current.x + 45, y: posRef.current.y + 108 })
          setShowDustCloud(true)
          setTimeout(() => {
            flightStateRef.current = 'idle'
            setFlightState('idle')
            scheduleWander()
          }, 600)
        }
        setRenderPos({ ...posRef.current })
      }

      // ── Idle bob ──
      if (flightStateRef.current === 'idle') {
        bobRef.current = lerp(bobRef.current, 0, 0.08)  // spring back to 0
        const bobOffset = Math.sin(now / 1600) * 4       // ±4px
        setBobY(bobOffset + bobRef.current)
      }

      // ── Head tracking lerp ──
      headCurRef.current.rx = lerp(headCurRef.current.rx, headTgtRef.current.rx, 0.05)
      headCurRef.current.ry = lerp(headCurRef.current.ry, headTgtRef.current.ry, 0.05)
      const hr = headCurRef.current
      if (Math.abs(hr.rx - headCurRef.current.rx) > 0.05 || Math.abs(hr.ry - headCurRef.current.ry) > 0.05) {
        setHeadRot({ rx: hr.rx, ry: hr.ry })
      } else {
        setHeadRot(prev =>
          Math.abs(prev.rx - hr.rx) > 0.05 || Math.abs(prev.ry - hr.ry) > 0.05
            ? { rx: hr.rx, ry: hr.ry }
            : prev
        )
      }

      // Notify ParallaxStarField of cursor position
      onTick?.(cursorRef.current)

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    scheduleWander()

    return () => {
      cancelAnimationFrame(rafRef.current)
      if (wanderTimer.current) clearTimeout(wanderTimer.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Click handler ──
  const onClickAstronaut = useCallback(() => {
    setShowSparkBurst(true)
  }, [])

  const onSparkDone = useCallback(() => setShowSparkBurst(false), [])
  const onDustDone  = useCallback(() => setShowDustCloud(false),  [])

  const moodTransform =
    mood === 'worried'  ? 'rotate(-5deg)'   :
    mood === 'depleted' ? 'translateY(6px)' : ''

  const state: AstronautRenderState = {
    pos:          renderPos,
    flightState,
    heading,
    isMovingRight,
    eyeVisible,
    mood,
    founderBadge,
    headRotX:     headRot.ry * -0.5,
    headRotY:     headRot.rx,
    flamesActive,
  }

  // Nozzle world positions (approx bottom of jetpack)
  const nozzleLeft:  Vec2 = { x: renderPos.x + 29, y: renderPos.y + 95 }
  const nozzleRight: Vec2 = { x: renderPos.x + 61, y: renderPos.y + 95 }

  return {
    state,
    flightState,
    flamesActive,
    pos: renderPos,
    nozzleLeft,
    nozzleRight,
    onClickAstronaut,
    showSparkBurst,
    onSparkDone,
    showDustCloud,
    onDustDone,
    dustPos: { x: renderPos.x + 45, y: renderPos.y + 108 },
  }
}
