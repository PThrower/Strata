'use client'

import { useEffect, useState } from 'react'
import type { FlameParticleData, DustParticleData, SparkData } from './types'

// ─── Flame Particle ───────────────────────────────────────────────────────────
// Emitted continuously during jetpack flight. Small orange→yellow→transparent ovals
// that drift downward + spread.

interface FlameEmitterProps {
  active: boolean
  originX: number  // viewport x of left nozzle
  originY: number  // viewport y of both nozzles
  originX2: number // viewport x of right nozzle
}

export function FlameEmitter({ active, originX, originY, originX2 }: FlameEmitterProps) {
  const [particles, setParticles] = useState<FlameParticleData[]>([])

  useEffect(() => {
    if (!active) {
      setParticles([])
      return
    }
    let id = 0
    const interval = setInterval(() => {
      const now = Date.now()
      setParticles(prev => {
        // Remove old particles (> 350ms)
        const alive = prev.filter(p => now - p.id < 350)
        // Emit 2 new particles per tick (one per nozzle)
        const newLeft: FlameParticleData = {
          id: now + id++,
          x: originX + (Math.random() - 0.5) * 6,
          y: originY,
          angle: 90 + (Math.random() - 0.5) * 30,
          speed: 2 + Math.random() * 1.5,
        }
        const newRight: FlameParticleData = {
          id: now + id++,
          x: originX2 + (Math.random() - 0.5) * 6,
          y: originY,
          angle: 90 + (Math.random() - 0.5) * 30,
          speed: 2 + Math.random() * 1.5,
        }
        return [...alive, newLeft, newRight]
      })
    }, 60)
    return () => clearInterval(interval)
  }, [active, originX, originY, originX2])

  if (!active && particles.length === 0) return null

  return (
    <>
      {particles.map(p => {
        const age = (Date.now() - p.id) / 350
        const opacity = Math.max(0, 1 - age)
        const dy = p.speed * age * 18
        const dx = Math.cos((p.angle * Math.PI) / 180) * dy * 0.4
        return (
          <div
            key={p.id}
            style={{
              position: 'fixed',
              left: p.x + dx,
              top:  p.y + dy,
              width:  6 + age * 4,
              height: 10 + age * 6,
              borderRadius: '50%',
              background: `radial-gradient(ellipse at 50% 30%, #ffbe20, #ff6b1a)`,
              opacity,
              transform: `rotate(${p.angle - 90}deg)`,
              pointerEvents: 'none',
              zIndex: 9998,
            }}
          />
        )
      })}
    </>
  )
}

// ─── Dust Cloud ───────────────────────────────────────────────────────────────
// Spawned once on landing. 6-8 small gray particles radiate outward and fade.

interface DustCloudProps {
  x: number
  y: number
  onDone: () => void
}

export function DustCloud({ x, y, onDone }: DustCloudProps) {
  const [particles] = useState<DustParticleData[]>(() =>
    Array.from({ length: 7 }, (_, i) => ({
      id: i,
      x, y,
      angle: (360 / 7) * i + Math.random() * 15,
      size: 4 + Math.random() * 4,
    }))
  )

  useEffect(() => {
    const t = setTimeout(onDone, 500)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <>
      {particles.map(p => (
        <div
          key={p.id}
          style={{
            position: 'fixed',
            left: p.x,
            top:  p.y,
            width:  p.size,
            height: p.size,
            borderRadius: '50%',
            background: 'rgba(200,210,230,0.7)',
            pointerEvents: 'none',
            zIndex: 9998,
            animation: `dust-radiate 480ms ease-out forwards`,
            '--angle': `${p.angle}deg`,
            '--dist': `${20 + Math.random() * 14}px`,
          } as React.CSSProperties}
        />
      ))}
    </>
  )
}

// ─── Spark Burst ─────────────────────────────────────────────────────────────
// 6-8 emerald sparks on click, radiate and fade — same as old AstronautPet click.

interface SparkBurstProps {
  x: number
  y: number
  onDone: () => void
}

export function SparkBurst({ x, y, onDone }: SparkBurstProps) {
  const [sparks] = useState<SparkData[]>(() => {
    const count = 8 + Math.floor(Math.random() * 2)
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      x, y,
      angle: (360 / count) * i + Math.random() * 20,
      dist: 30 + Math.random() * 24,
    }))
  })

  useEffect(() => {
    const t = setTimeout(onDone, 650)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <>
      {sparks.map(s => (
        <div
          key={s.id}
          style={{
            position: 'fixed',
            left: s.x,
            top:  s.y,
            width: 9,
            height: 9,
            borderRadius: '50%',
            background: '#00e882',
            boxShadow: '0 0 8px 3px rgba(0,196,114,0.75)',
            pointerEvents: 'none',
            zIndex: 10000,
            animation: 'dash-particle 640ms ease-out forwards',
            '--angle': `${s.angle}deg`,
            '--dist': `${s.dist}px`,
          } as React.CSSProperties}
        />
      ))}
    </>
  )
}
