// ─── Mood ────────────────────────────────────────────────────────────────────

export type Mood = 'happy' | 'neutral' | 'worried' | 'depleted'

export function getMood(pct: number): Mood {
  if (pct <= 60)  return 'happy'
  if (pct <= 85)  return 'neutral'
  if (pct < 100)  return 'worried'
  return 'depleted'
}

// ─── Movement ────────────────────────────────────────────────────────────────

export type FlightState = 'idle' | 'flying' | 'landing'

export interface Vec2 {
  x: number
  y: number
}

export interface MovementTarget {
  id: string
  x: number   // viewport center x
  y: number   // viewport center y
}

// ─── Particles ───────────────────────────────────────────────────────────────

export interface FlameParticleData {
  id: number
  x: number        // absolute viewport x
  y: number        // absolute viewport y
  angle: number    // degrees, 90 = straight down
  speed: number    // px per frame
}

export interface DustParticleData {
  id: number
  x: number
  y: number
  angle: number
  size: number
}

export interface SparkData {
  id: number
  x: number
  y: number
  angle: number
  dist: number
}

// ─── Props ───────────────────────────────────────────────────────────────────

export interface AstronautPetProps {
  usagePercent: number
  apiCallCount?: number
  founderBadge?: boolean
}

// ─── Brain state (passed from hook to renderers) ──────────────────────────────

export interface AstronautRenderState {
  pos: Vec2                 // current viewport position (top-left of astronaut)
  flightState: FlightState
  heading: number           // degrees, 0 = right, 90 = down (for lean)
  isMovingRight: boolean
  eyeVisible: boolean
  mood: Mood
  founderBadge: boolean
  // head tracking
  headRotX: number          // perspective rotateX degrees
  headRotY: number          // perspective rotateY degrees
  // flame
  flamesActive: boolean
}
