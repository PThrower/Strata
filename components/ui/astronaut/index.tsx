'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { AstronautSVG } from './AstronautSVG'
import { useAstronautBrain } from './AstronautBrain'
import { FlameEmitter, DustCloud, SparkBurst } from './AstronautParticles'
import type { AstronautPetProps, Vec2 } from './types'

export type { AstronautPetProps, Mood } from './types'
export { getMood } from './types'

// ─── Tooltip ──────────────────────────────────────────────────────────────────

const MOOD_TOOLTIP = {
  happy:    'All systems nominal ✓',
  neutral:  'Watch your calls...',
  worried:  'Getting close! 👀',
  depleted: 'Out of fuel... upgrade?',
} as const

function Tooltip({ text }: { text: string }) {
  return (
    <div style={{
      position: 'absolute', bottom: 'calc(100% + 8px)', left: '50%',
      transform: 'translateX(-50%)',
      background: 'rgba(5,6,13,0.94)',
      border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: 8, padding: '5px 10px',
      fontFamily: 'var(--font-mono)', fontSize: 11,
      color: 'rgba(255,255,255,0.84)', whiteSpace: 'nowrap',
      pointerEvents: 'none', zIndex: 10001,
      boxShadow: '0 4px 14px rgba(0,0,0,0.5)',
    }}>
      {text}
      <div style={{
        position: 'absolute', top: '100%', left: '50%',
        transform: 'translateX(-50%)',
        borderLeft: '5px solid transparent',
        borderRight: '5px solid transparent',
        borderTop: '5px solid rgba(5,6,13,0.94)',
      }} />
    </div>
  )
}

// ─── AstronautPet: portal-mounted astronaut ────────────────────────────────────

function AstronautPortal({ usagePercent, apiCallCount = 0, founderBadge = false }: AstronautPetProps) {
  const [showTooltip, setShowTooltip] = useState(false)

  // Parallax sync callback — ParallaxStarField subscribes via window custom event
  const onTick = (cursor: Vec2) => {
    if (typeof window !== 'undefined') {
      // Dispatch a lightweight cursor event for ParallaxStarField to consume
      // (avoids prop-drilling through portal boundary)
      ;(window as Window & { __astroCursor?: Vec2 }).__astroCursor = cursor
    }
  }

  const {
    state,
    flamesActive,
    pos,
    nozzleLeft,
    nozzleRight,
    onClickAstronaut,
    showSparkBurst,
    onSparkDone,
    showDustCloud,
    onDustDone,
    dustPos,
  } = useAstronautBrain({ usagePercent, apiCallCount, founderBadge, onTick })

  const moodTransform =
    state.mood === 'worried'  ? 'rotate(-5deg)'   :
    state.mood === 'depleted' ? 'translateY(6px)' : ''

  const idleClass =
    state.flightState === 'idle' ? (
      state.mood === 'happy'    ? 'astro-float' :
      state.mood === 'neutral'  ? 'astro-float-neutral' :
      state.mood === 'worried'  ? 'astro-float-worried' : ''
    ) : ''

  // During flight: lean forward in direction of travel
  const flightLean = state.flightState === 'flying'
    ? `rotate(${state.isMovingRight ? 15 : -15}deg)`
    : ''

  // Landing bounce
  const landClass = state.flightState === 'landing' ? 'astro-bounce' : ''

  const bobStyle = state.flightState === 'idle'
    ? {}
    : {}

  return (
    <>
      {/* ── Flame emitter (behind astronaut) ── */}
      <FlameEmitter
        active={flamesActive}
        originX={nozzleLeft.x}
        originY={nozzleLeft.y}
        originX2={nozzleRight.x}
      />

      {/* ── The astronaut ── */}
      <div
        style={{
          position: 'fixed',
          left: pos.x,
          top:  pos.y,
          width: 90,
          height: 110,
          zIndex: 9999,
          cursor: 'pointer',
          userSelect: 'none',
        }}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={onClickAstronaut}
      >
        {showTooltip && <Tooltip text={MOOD_TOOLTIP[state.mood]} />}

        {/* Layer 1: mood persistent offset */}
        <div style={{ transform: moodTransform, transformOrigin: 'center bottom', width: '100%', height: '100%' }}>
          {/* Layer 2: idle float / flight lean / landing bounce */}
          <div
            className={`${idleClass} ${landClass}`.trim()}
            style={{ transform: flightLean, transformOrigin: 'center', width: '100%', height: '100%' }}
          >
            {/* Layer 3: head tracking perspective (direct DOM, no state) */}
            <div style={{ width: '100%', height: '100%', willChange: 'transform' }}>
              <AstronautSVG
                mood={state.mood}
                founderBadge={state.founderBadge}
                eyeVisible={state.eyeVisible}
                flamesActive={flamesActive}
              />
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 2 }}>
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 9,
            color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em',
          }}>
            co-pilot
          </span>
        </div>
      </div>

      {/* ── Landing dust ── */}
      {showDustCloud && (
        <DustCloud x={dustPos.x} y={dustPos.y} onDone={onDustDone} />
      )}

      {/* ── Click sparks ── */}
      {showSparkBurst && (
        <SparkBurst x={pos.x + 45} y={pos.y + 55} onDone={onSparkDone} />
      )}
    </>
  )
}

// ─── Public export ────────────────────────────────────────────────────────────

export function AstronautPet(props: AstronautPetProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return createPortal(<AstronautPortal {...props} />, document.body)
}
