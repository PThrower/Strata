import type { Mood } from './types'

// ─── Visor mood tinting ───────────────────────────────────────────────────────
// Phase B will vary the visor tint by mood.
// Phase A: always blue star-field visor.

interface AstronautSVGProps {
  mood: Mood
  founderBadge?: boolean
  eyeVisible: boolean
  flamesActive?: boolean
  isMovingRight?: boolean
}

// Random-but-stable star positions inside the visor (seeded manually)
const VISOR_STARS: Array<{ cx: number; cy: number; r: number }> = [
  { cx: 34, cy: 19, r: 0.9 },
  { cx: 39, cy: 17, r: 0.7 },
  { cx: 47, cy: 20, r: 1.0 },
  { cx: 52, cy: 16, r: 0.8 },
  { cx: 44, cy: 23, r: 0.6 },
  { cx: 36, cy: 25, r: 0.8 },
  { cx: 55, cy: 22, r: 0.7 },
  { cx: 41, cy: 29, r: 0.9 },
]

export function AstronautSVG({
  mood,
  founderBadge,
  eyeVisible,
  flamesActive = false,
}: AstronautSVGProps) {
  const depleted = mood === 'depleted'
  const glowAlpha = depleted ? 0.12 : 0.35

  return (
    <svg
      width={90} height={110}
      viewBox="0 0 90 110"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ filter: `drop-shadow(0 0 7px rgba(95,176,133,${glowAlpha}))`, overflow: 'visible' }}
      aria-hidden="true"
    >
      <defs>
        {/* Visor gradient — deep blue star-field */}
        <linearGradient id="visorGrad" x1="45" y1="14" x2="45" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#0a1628" />
          <stop offset="100%" stopColor="#1a3a6b" />
        </linearGradient>

        {/* Suit body shading gradient */}
        <linearGradient id="suitGrad" x1="21" y1="51" x2="69" y2="85" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#eef1f8" />
          <stop offset="55%"  stopColor="#dde4f0" />
          <stop offset="100%" stopColor="#b8c0d0" />
        </linearGradient>

        {/* Helmet gradient */}
        <linearGradient id="helmetGrad" x1="25" y1="5" x2="65" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#eef1f8" />
          <stop offset="60%"  stopColor="#dde4f0" />
          <stop offset="100%" stopColor="#c4cad8" />
        </linearGradient>

        {/* Arm gradient */}
        <linearGradient id="armGradL" x1="8" y1="56" x2="23" y2="76" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#eef1f8" />
          <stop offset="100%" stopColor="#b8c0d0" />
        </linearGradient>
        <linearGradient id="armGradR" x1="67" y1="56" x2="82" y2="76" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#eef1f8" />
          <stop offset="100%" stopColor="#b8c0d0" />
        </linearGradient>

        {/* Leg gradient */}
        <linearGradient id="legGradL" x1="27" y1="83" x2="42" y2="105" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#dde4f0" />
          <stop offset="100%" stopColor="#b0bac8" />
        </linearGradient>
        <linearGradient id="legGradR" x1="48" y1="83" x2="63" y2="105" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#dde4f0" />
          <stop offset="100%" stopColor="#b0bac8" />
        </linearGradient>

        {/* Flame gradient (for jetpack) */}
        <linearGradient id="flameGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#ff8c1a" stopOpacity={0.95} />
          <stop offset="50%"  stopColor="#ffbe20" stopOpacity={0.7} />
          <stop offset="100%" stopColor="#fff176" stopOpacity={0} />
        </linearGradient>

        {/* Chest panel indicator glows */}
        <radialGradient id="redGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ef4444" stopOpacity={0.6} />
          <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
        </radialGradient>
        <radialGradient id="amberGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.6} />
          <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
        </radialGradient>
      </defs>

      {/* ═══ JETPACK (behind body) ═══════════════════════════════════════════ */}
      <g id="jetpack">
        {/* Left cylinder */}
        <rect x={24} y={55} width={11} height={22} rx={5} fill="#7a8696" />
        <rect x={24} y={55} width={11} height={22} rx={5} fill="none"
          stroke="rgba(255,255,255,0.12)" strokeWidth={0.6} />
        {/* Left gold accent band */}
        <rect x={24} y={62} width={11} height={3} rx={1} fill="#c8920a" />

        {/* Right cylinder */}
        <rect x={55} y={55} width={11} height={22} rx={5} fill="#7a8696" />
        <rect x={55} y={55} width={11} height={22} rx={5} fill="none"
          stroke="rgba(255,255,255,0.12)" strokeWidth={0.6} />
        {/* Right gold accent band */}
        <rect x={55} y={62} width={11} height={3} rx={1} fill="#c8920a" />

        {/* Cross-bar connecting cylinders */}
        <rect x={27} y={58} width={36} height={5} rx={2} fill="#8a9aaa" />

        {/* Left nozzle */}
        <ellipse cx={29.5} cy={77} rx={5} ry={3} fill="#2e3540" />
        <ellipse cx={29.5} cy={77} rx={3} ry={1.8} fill="#1a2028" />
        {/* Right nozzle */}
        <ellipse cx={60.5} cy={77} rx={5} ry={3} fill="#2e3540" />
        <ellipse cx={60.5} cy={77} rx={3} ry={1.8} fill="#1a2028" />

        {/* Jetpack flames — shown when flamesActive */}
        {flamesActive && (
          <>
            <ellipse cx={29.5} cy={83} rx={4} ry={7}
              fill="url(#flameGrad)"
              style={{ animation: 'jetpack-flame 120ms ease-in-out infinite alternate' }}
            />
            <ellipse cx={60.5} cy={83} rx={4} ry={7}
              fill="url(#flameGrad)"
              style={{ animation: 'jetpack-flame 120ms ease-in-out infinite alternate', animationDelay: '60ms' }}
            />
          </>
        )}
      </g>

      {/* ═══ LEGS ═══════════════════════════════════════════════════════════ */}
      <g id="legs">
        {/* Left leg */}
        <rect x={27} y={83} width={15} height={22} rx={6} fill="url(#legGradL)" />
        {/* Left knee ring */}
        <rect x={27} y={96} width={15} height={4} rx={2} fill="#c8920a" />
        {/* Left boot */}
        <rect x={26} y={100} width={17} height={11} rx={5} fill="#4a5060" />
        <rect x={26} y={100} width={17} height={11} rx={5} fill="none"
          stroke="rgba(255,255,255,0.08)" strokeWidth={0.5} />

        {/* Right leg */}
        <rect x={48} y={83} width={15} height={22} rx={6} fill="url(#legGradR)" />
        {/* Right knee ring */}
        <rect x={48} y={96} width={15} height={4} rx={2} fill="#c8920a" />
        {/* Right boot */}
        <rect x={47} y={100} width={17} height={11} rx={5} fill="#4a5060" />
        <rect x={47} y={100} width={17} height={11} rx={5} fill="none"
          stroke="rgba(255,255,255,0.08)" strokeWidth={0.5} />
      </g>

      {/* ═══ BODY ════════════════════════════════════════════════════════════ */}
      <g id="body">
        {/* Main torso */}
        <rect x={21} y={51} width={48} height={34} rx={13} fill="url(#suitGrad)" />
        {/* Torso outline — subtle */}
        <rect x={21} y={51} width={48} height={34} rx={13} fill="none"
          stroke="rgba(200,210,230,0.4)" strokeWidth={0.6} />
        {/* Shoulder seam highlight */}
        <path d="M 28 52 Q 45 48 62 52" stroke="#eef1f8" strokeWidth={1.2}
          strokeLinecap="round" fill="none" opacity={0.7} />

        {/* Chest panel */}
        <g id="chestPanel">
          <rect x={32} y={58} width={26} height={16} rx={4} fill="#12181e" />
          <rect x={32} y={58} width={26} height={16} rx={4} fill="none"
            stroke="rgba(255,255,255,0.15)" strokeWidth={0.5} />

          {/* Red indicator glow bg */}
          <ellipse cx={38} cy={66} rx={6} ry={6} fill="url(#redGlow)" opacity={0.8} />
          {/* Red indicator dot */}
          <circle cx={38} cy={66} r={3} fill="#ef4444" />
          <circle cx={37} cy={65} r={1} fill="rgba(255,255,255,0.4)" />

          {/* Amber indicator glow bg */}
          <ellipse cx={48} cy={66} rx={6} ry={6} fill="url(#amberGlow)" opacity={0.8} />
          {/* Amber indicator dot */}
          <circle cx={48} cy={66} r={3} fill="#f59e0b" />
          <circle cx={47} cy={65} r={1} fill="rgba(255,255,255,0.4)" />

          {/* Panel decorative bar */}
          <rect x={34} y={70} width={22} height={2} rx={1} fill="rgba(255,255,255,0.08)" />
        </g>
      </g>

      {/* ═══ LEFT ARM ════════════════════════════════════════════════════════ */}
      <g id="leftArm">
        <rect
          x={depleted ? 9 : 8} y={depleted ? 62 : 56}
          width={15} height={20} rx={7}
          fill="url(#armGradL)"
          transform={depleted ? 'rotate(25 15 72)' : undefined}
        />
        {/* Elbow ring */}
        <rect
          x={depleted ? 9 : 9} y={depleted ? 70 : 67}
          width={12} height={4} rx={2}
          fill="#c8920a"
          transform={depleted ? 'rotate(25 15 72)' : undefined}
        />
        {/* Glove */}
        <rect
          x={depleted ? 8 : 8} y={depleted ? 75 : 74}
          width={14} height={10} rx={6}
          fill="#4a5060"
          transform={depleted ? 'rotate(25 15 80)' : undefined}
        />
      </g>

      {/* ═══ RIGHT ARM ═══════════════════════════════════════════════════════ */}
      <g id="rightArm">
        <rect
          x={depleted ? 66 : 67} y={depleted ? 62 : 56}
          width={15} height={20} rx={7}
          fill="url(#armGradR)"
          transform={depleted ? 'rotate(-25 75 72)' : undefined}
        />
        {/* Elbow ring */}
        <rect
          x={depleted ? 69 : 69} y={depleted ? 70 : 67}
          width={12} height={4} rx={2}
          fill="#c8920a"
          transform={depleted ? 'rotate(-25 75 72)' : undefined}
        />
        {/* Glove */}
        <rect
          x={depleted ? 68 : 68} y={depleted ? 75 : 74}
          width={14} height={10} rx={6}
          fill="#4a5060"
          transform={depleted ? 'rotate(-25 75 80)' : undefined}
        />
      </g>

      {/* ═══ HELMET ══════════════════════════════════════════════════════════ */}
      <g id="helmet">
        {/* Neck connector */}
        <rect x={37} y={47} width={16} height={7} rx={3} fill="#c5cad8" />
        <rect x={37} y={47} width={16} height={7} rx={3} fill="none"
          stroke="rgba(200,210,230,0.3)" strokeWidth={0.5} />

        {/* Helmet sphere */}
        <circle cx={45} cy={27} r={22} fill="url(#helmetGrad)" />
        <circle cx={45} cy={27} r={22} fill="none"
          stroke="rgba(200,210,230,0.4)" strokeWidth={0.8} />

        {/* Helmet top specular arc */}
        <path d="M 28 18 Q 38 8 55 14" stroke="#ffffff" strokeWidth={1.5}
          strokeLinecap="round" fill="none" opacity={0.35} />

        {/* Visor — filled with star-field gradient */}
        <rect x={29} y={14} width={32} height={26} rx={14}
          fill="url(#visorGrad)" />
        {/* Stars inside visor */}
        {VISOR_STARS.map((s, i) => (
          <circle key={i} cx={s.cx} cy={s.cy} r={s.r}
            fill="rgba(255,255,255,0.85)" />
        ))}
        {/* Visor specular — prominent shine, rx=8 ry=5 per spec */}
        <ellipse cx={36} cy={20} rx={8} ry={5}
          fill="rgba(255,255,255,0.28)" />
        {/* Visor rim — ice-blue glow */}
        <rect x={29} y={14} width={32} height={26} rx={14}
          fill="none"
          stroke="rgba(120,200,255,0.40)"
          strokeWidth={0.75} />

        {/* Eyes — only visible through visor when eye-visible */}
        {eyeVisible && (
          <>
            <circle cx={38} cy={26} r={2.4}
              fill="rgba(255,255,255,0.88)"
              style={{ transition: 'opacity 80ms linear' }} />
            <circle cx={52} cy={26} r={2.4}
              fill="rgba(255,255,255,0.88)"
              style={{ transition: 'opacity 80ms linear' }} />
            {/* Pupils */}
            <circle cx={38.5} cy={26.5} r={1.1} fill="rgba(5,15,35,0.7)" />
            <circle cx={52.5} cy={26.5} r={1.1} fill="rgba(5,15,35,0.7)" />
          </>
        )}

        {/* Neck seal ring */}
        <ellipse cx={45} cy={48} rx={12} ry={3.5}
          fill="#c8cedd" stroke="rgba(200,210,230,0.3)" strokeWidth={0.5} />

        {/* Founder gold star — top-right of helmet */}
        {founderBadge && (
          <g transform="translate(60,8) scale(0.6)">
            <polygon
              points="7,0 8.9,5.8 15,5.8 9.9,9.4 11.8,15.2 7,11.6 2.2,15.2 4.1,9.4 -1,5.8 5.1,5.8"
              fill="#fbbf24" stroke="#f59e0b" strokeWidth={0.8}
            />
          </g>
        )}
      </g>
    </svg>
  )
}
