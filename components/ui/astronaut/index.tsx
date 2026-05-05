'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { AstronautSVG } from './AstronautSVG'
import { useAstronautBrain } from './AstronautBrain'
import { FlameEmitter, DustCloud, SparkBurst } from './AstronautParticles'
import type { AstronautPetProps, Vec2, Mood } from './types'

export type { AstronautPetProps, Mood } from './types'
export { getMood } from './types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MOOD_TOOLTIP = {
  happy:    'All systems nominal ✓',
  neutral:  'Watch your calls...',
  worried:  'Getting close! 👀',
  depleted: 'Out of fuel... upgrade?',
} as const

// Derive the CSS class for the current idle/flight animation
function resolveAnimClass(
  flightAnimClass: string,
  idleAnimClass: string,
  mood: Mood,
): string {
  // Flight overrides everything
  if (flightAnimClass) return flightAnimClass
  // Named idle animation
  if (idleAnimClass !== 'base') return idleAnimClass
  // Base: mood-dependent float
  if (mood === 'happy')   return 'astro-float'
  if (mood === 'neutral') return 'astro-float-neutral'
  if (mood === 'worried') return 'astro-float-worried'
  return ''  // depleted: no animation
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────

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

// ─── AstronautPortal ──────────────────────────────────────────────────────────

function AstronautPortal({ usagePercent, apiCallCount = 0, founderBadge = false }: AstronautPetProps) {
  const [showTooltip, setShowTooltip] = useState(false)
  const [flipping,    setFlipping]    = useState(false)

  const onTick = (cursor: Vec2) => {
    ;(window as Window & { __astroCursor?: Vec2 }).__astroCursor = cursor
  }

  const {
    state,
    flamesActive,
    pos,
    bobY,
    scale,
    idleAnimClass,
    flightAnimClass,
    nozzleLeft,
    nozzleRight,
    onClickAstronaut,
    showSparkBurst,
    onSparkDone,
    showDustCloud,
    onDustDone,
    dustPos,
  } = useAstronautBrain({ usagePercent, apiCallCount, founderBadge, onTick })

  // Combine animation class
  const animClass = resolveAnimClass(flightAnimClass, idleAnimClass, state.mood)

  // Mood persistent transform (applied to inner layer so it doesn't conflict with animation)
  const moodTransform =
    state.mood === 'worried'  ? 'rotate(-5deg)'   :
    state.mood === 'depleted' ? 'translateY(6px)' : ''

  const handleClick = () => {
    onClickAstronaut()
    if (!flipping) {
      setFlipping(true)
      setTimeout(() => setFlipping(false), 520)
    }
  }

  // Forward lean during glide (inline, complements the wobble class)
  const flightLean = flightAnimClass === 'astro-flight-glide'
    ? `rotate(${state.isMovingRight ? 18 : -18}deg)`
    : ''

  return (
    <>
      {/* Flame emitter — positioned behind astronaut */}
      <FlameEmitter
        active={flamesActive}
        originX={nozzleLeft.x}
        originY={nozzleLeft.y}
        originX2={nozzleRight.x}
      />

      {/* ── Outer positioning wrapper (pointer-events: none so it doesn't block page) ── */}
      <div
        className={flightAnimClass === 'astro-flight-glide' ? 'larry-flying' : flightAnimClass === '' ? 'larry-idle' : ''}
        style={{
          position: 'fixed',
          left:   pos.x,
          top:    pos.y + bobY,
          width:  90,
          height: 120,
          zIndex: 9999,
          pointerEvents: 'none',      // ← transparent to mouse by default
          transformOrigin: 'center bottom',
        }}
      >
        {/* ── Inner interactive wrapper (pointer-events: auto on the astronaut itself) ── */}
        <div
          style={{
            width: '100%', height: '100%',
            pointerEvents: 'auto',    // ← the astronaut catches mouse events
            cursor: 'pointer',
            userSelect: 'none',
            position: 'relative',
            perspective: '600px',
            transform: scale !== 1 ? `scale(${scale})` : undefined,
            transformOrigin: 'center bottom',
          }}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          onClick={handleClick}
        >
          {showTooltip && <Tooltip text={MOOD_TOOLTIP[state.mood]} />}

          {/* Flip wrapper — rotateY on click, separate from float/glide animations */}
          <div style={{
            width: '100%', height: '100%',
            animation: flipping ? 'dash-flip 520ms ease-in-out' : undefined,
            transformOrigin: 'center center',
          }}>
            {/* Layer 1: animation class (flight wobble / idle float / specific idle) */}
            <div
              className={animClass}
              style={{ width: '100%', height: '100%', transformOrigin: 'center bottom' }}
            >
              {/* Layer 2: mood persistent offset + flight lean */}
              <div style={{
                width: '100%', height: '100%',
                transform: [moodTransform, flightLean].filter(Boolean).join(' ') || undefined,
                transformOrigin: 'center bottom',
              }}>
                <AstronautSVG
                  mood={state.mood}
                  founderBadge={state.founderBadge}
                  eyeVisible={state.eyeVisible}
                  flamesActive={flamesActive}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Landing dust */}
      {showDustCloud && (
        <DustCloud x={dustPos.x} y={dustPos.y} onDone={onDustDone} />
      )}

      {/* Click sparks */}
      {showSparkBurst && (
        <SparkBurst x={pos.x + 45} y={pos.y + 58} onDone={onSparkDone} />
      )}
    </>
  )
}

// ─── Public export ────────────────────────────────────────────────────────────

export function AstronautPet(props: AstronautPetProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return null
  return createPortal(<AstronautPortal {...props} />, document.body)
}
