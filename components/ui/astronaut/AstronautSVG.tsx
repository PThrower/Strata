import type { Mood } from './types'

interface AstronautSVGProps {
  mood: Mood
  founderBadge?: boolean
  eyeVisible: boolean
  flamesActive?: boolean
}

// 10 stars verified inside visor ellipse (cx=50 cy=33 rx=22 ry=19)
const VISOR_STARS: Array<{ cx: number; cy: number; r: number }> = [
  { cx: 40, cy: 20, r: 1.0 },
  { cx: 52, cy: 19, r: 0.8 },
  { cx: 61, cy: 23, r: 0.9 },
  { cx: 66, cy: 30, r: 0.7 },
  { cx: 43, cy: 26, r: 0.7 },
  { cx: 57, cy: 29, r: 0.6 },
  { cx: 36, cy: 30, r: 0.8 },
  { cx: 64, cy: 38, r: 0.7 },
  { cx: 34, cy: 37, r: 0.8 },
  { cx: 47, cy: 43, r: 0.6 },
]

const OUTLINE = '#1a1a2e'
const GOLD    = '#c8920a'
const GLOVE   = '#4a5568'

export function AstronautSVG({
  mood,
  founderBadge,
  eyeVisible,
  flamesActive = false,
}: AstronautSVGProps) {
  const depleted = mood === 'depleted'
  const glowAlpha = depleted ? 0.10 : 0.32

  const leftArmTransform  = depleted ? 'rotate(28, 18, 65)' : undefined
  const rightArmTransform = depleted ? 'rotate(-28, 82, 65)' : undefined

  return (
    <svg
      width={90} height={117}
      viewBox="0 0 100 130"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        filter: `drop-shadow(0 0 8px rgba(95,176,133,${glowAlpha}))`,
        overflow: 'visible',
      }}
      aria-hidden="true"
    >
      <defs>
        {/* Visor clip — cx=50 cy=33 rx=22 ry=19 */}
        <clipPath id="visorClip">
          <ellipse cx="50" cy="33" rx="22" ry="19" />
        </clipPath>

        {/* Visor gradient */}
        <linearGradient id="lv" x1="50" y1="14" x2="50" y2="52" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#0a1628" />
          <stop offset="100%" stopColor="#1e4080" />
        </linearGradient>

        {/* Helmet gradient */}
        <linearGradient id="lh" x1="21" y1="2" x2="79" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#eef1f8" />
          <stop offset="60%"  stopColor="#dde4f0" />
          <stop offset="100%" stopColor="#b8c4d4" />
        </linearGradient>

        {/* Suit body gradient */}
        <linearGradient id="ls" x1="28" y1="58" x2="72" y2="94" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#eef1f8" />
          <stop offset="55%"  stopColor="#dde4f0" />
          <stop offset="100%" stopColor="#b4bece" />
        </linearGradient>

        {/* Arm gradients */}
        <linearGradient id="lal" x1="10" y1="65" x2="25" y2="93" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#e8edf6" />
          <stop offset="100%" stopColor="#b0bac8" />
        </linearGradient>
        <linearGradient id="lar" x1="90" y1="65" x2="75" y2="93" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#e8edf6" />
          <stop offset="100%" stopColor="#b0bac8" />
        </linearGradient>

        {/* Leg gradients */}
        <linearGradient id="lll" x1="30" y1="94" x2="46" y2="130" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#dde4f0" />
          <stop offset="100%" stopColor="#a8b2c2" />
        </linearGradient>
        <linearGradient id="llr" x1="70" y1="94" x2="54" y2="130" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#dde4f0" />
          <stop offset="100%" stopColor="#a8b2c2" />
        </linearGradient>

        {/* Flame gradient */}
        <linearGradient id="lf" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#ff8c1a" stopOpacity={0.95} />
          <stop offset="55%"  stopColor="#ffbe20" stopOpacity={0.70} />
          <stop offset="100%" stopColor="#fff176" stopOpacity={0} />
        </linearGradient>

        {/* Indicator glows */}
        <radialGradient id="rg" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#dc2626" stopOpacity={0.55} />
          <stop offset="100%" stopColor="#dc2626" stopOpacity={0} />
        </radialGradient>
        <radialGradient id="ag" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#f59e0b" stopOpacity={0.55} />
          <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
        </radialGradient>
      </defs>

      {/* ═══════════════════════════════════════════════════════════
          JETPACK — behind torso
          ═══════════════════════════════════════════════════════════ */}
      <g id="jetpack">
        <rect x={26} y={60} width={48} height={30} rx={13}
          fill="#7a8696" stroke={OUTLINE} strokeWidth={1.5} />
        <rect x={30} y={68} width={40} height={4} rx={1}
          fill={GOLD} stroke={OUTLINE} strokeWidth={0.5} />
        <path d="M 32 62 Q 50 58 68 62"
          stroke="rgba(255,255,255,0.25)" strokeWidth={1.2}
          strokeLinecap="round" fill="none" />

        {/* Left nozzle */}
        <ellipse cx={34} cy={92} rx={6} ry={4}
          fill="#2e3540" stroke={OUTLINE} strokeWidth={1} />
        <ellipse cx={34} cy={92} rx={4} ry={2.5} fill="#1a2028" />

        {/* Right nozzle */}
        <ellipse cx={66} cy={92} rx={6} ry={4}
          fill="#2e3540" stroke={OUTLINE} strokeWidth={1} />
        <ellipse cx={66} cy={92} rx={4} ry={2.5} fill="#1a2028" />

        {flamesActive && (
          <>
            <ellipse cx={34} cy={99} rx={4.5} ry={8}
              fill="url(#lf)"
              style={{ animation: 'jetpack-flame 120ms ease-in-out infinite alternate' }}
            />
            <ellipse cx={66} cy={99} rx={4.5} ry={8}
              fill="url(#lf)"
              style={{ animation: 'jetpack-flame 120ms ease-in-out infinite alternate', animationDelay: '60ms' }}
            />
          </>
        )}
      </g>

      {/* ═══════════════════════════════════════════════════════════
          LEGS — wider stance x=30/54
          ═══════════════════════════════════════════════════════════ */}
      <g id="legs">
        {/* ── Left leg ── */}
        <rect x={30} y={94} width={16} height={20} rx={6}
          fill="url(#lll)" stroke={OUTLINE} strokeWidth={1.5} />
        {/* Left thigh ring */}
        <rect x={30} y={95} width={16} height={4} rx={2}
          fill={GOLD} stroke={OUTLINE} strokeWidth={0.8} />
        {/* Left knee pad — chunky */}
        <rect x={27} y={102} width={22} height={15} rx={6}
          fill="#6b7280" stroke={GOLD} strokeWidth={1.5} />
        <rect x={27} y={102} width={22} height={15} rx={6}
          fill="none" stroke={OUTLINE} strokeWidth={0.5} opacity={0.5} />
        {/* Left boot top ring */}
        <rect x={27} y={111} width={22} height={5} rx={2}
          fill={GOLD} stroke={OUTLINE} strokeWidth={0.8} />
        {/* Left boot */}
        <rect x={26} y={115} width={24} height={15} rx={7}
          fill={GLOVE} stroke={OUTLINE} strokeWidth={1.5} />
        <ellipse cx={38} cy={128} rx={8} ry={2.5}
          fill="rgba(255,255,255,0.1)" />

        {/* ── Right leg ── */}
        <rect x={54} y={94} width={16} height={20} rx={6}
          fill="url(#llr)" stroke={OUTLINE} strokeWidth={1.5} />
        {/* Right thigh ring */}
        <rect x={54} y={95} width={16} height={4} rx={2}
          fill={GOLD} stroke={OUTLINE} strokeWidth={0.8} />
        {/* Right knee pad — chunky */}
        <rect x={51} y={102} width={22} height={15} rx={6}
          fill="#6b7280" stroke={GOLD} strokeWidth={1.5} />
        <rect x={51} y={102} width={22} height={15} rx={6}
          fill="none" stroke={OUTLINE} strokeWidth={0.5} opacity={0.5} />
        {/* Right boot top ring */}
        <rect x={51} y={111} width={22} height={5} rx={2}
          fill={GOLD} stroke={OUTLINE} strokeWidth={0.8} />
        {/* Right boot */}
        <rect x={50} y={115} width={24} height={15} rx={7}
          fill={GLOVE} stroke={OUTLINE} strokeWidth={1.5} />
        <ellipse cx={62} cy={128} rx={8} ry={2.5}
          fill="rgba(255,255,255,0.1)" />
      </g>

      {/* ═══════════════════════════════════════════════════════════
          TORSO + CHEST PANEL
          ═══════════════════════════════════════════════════════════ */}
      <g id="body">
        <rect x={28} y={58} width={44} height={36} rx={12}
          fill="url(#ls)" stroke={OUTLINE} strokeWidth={1.5} />
        <path d="M 34 60 Q 50 56 66 60"
          stroke="#eef1f8" strokeWidth={1.2}
          strokeLinecap="round" fill="none" opacity={0.65} />

        {/* Chest panel — wider */}
        <rect x={33} y={66} width={34} height={22} rx={4}
          fill="#f0f4f8" stroke={OUTLINE} strokeWidth={1.5} />
        <rect x={33} y={75} width={34} height={2}
          fill={OUTLINE} opacity={0.18} />

        {/* Cord from panel bottom */}
        <path d="M 50 88 Q 48 92 44 95"
          stroke={OUTLINE} strokeWidth={0.8}
          strokeLinecap="round" fill="none" opacity={0.35} />

        {/* Red indicator glow */}
        <ellipse cx={43} cy={78} rx={7} ry={7} fill="url(#rg)" opacity={0.9} />
        <circle cx={43} cy={78} r={4.5}
          fill="#dc2626" stroke={OUTLINE} strokeWidth={1} />
        <circle cx={41.5} cy={76.5} r={1.5} fill="rgba(255,255,255,0.45)" />

        {/* Gold indicator glow */}
        <ellipse cx={57} cy={78} rx={7} ry={7} fill="url(#ag)" opacity={0.9} />
        <circle cx={57} cy={78} r={4.5}
          fill="#f59e0b" stroke={OUTLINE} strokeWidth={1} />
        <circle cx={55.5} cy={76.5} r={1.5} fill="rgba(255,255,255,0.45)" />
      </g>

      {/* ═══════════════════════════════════════════════════════════
          LEFT ARM — x=10 y=65 w=15 h=28
          ═══════════════════════════════════════════════════════════ */}
      <g id="leftArm" transform={leftArmTransform}>
        <rect x={10} y={65} width={15} height={28} rx={7}
          fill="url(#lal)" stroke={OUTLINE} strokeWidth={1.5} />
        <rect x={11} y={66} width={13} height={4} rx={2}
          fill={GOLD} stroke={OUTLINE} strokeWidth={0.8} />
        <rect x={11} y={89} width={13} height={4} rx={2}
          fill={GOLD} stroke={OUTLINE} strokeWidth={0.8} />
        {/* Glove — chunkier */}
        <rect x={8} y={91} width={20} height={14} rx={8}
          fill={GLOVE} stroke={OUTLINE} strokeWidth={1.5} />
        <path d="M 11 98 Q 18 96 27 98"
          stroke="rgba(255,255,255,0.12)" strokeWidth={1}
          strokeLinecap="round" fill="none" />
      </g>

      {/* ═══════════════════════════════════════════════════════════
          RIGHT ARM — x=75 y=65 w=15 h=28
          ═══════════════════════════════════════════════════════════ */}
      <g id="rightArm" transform={rightArmTransform}>
        <rect x={75} y={65} width={15} height={28} rx={7}
          fill="url(#lar)" stroke={OUTLINE} strokeWidth={1.5} />
        <rect x={76} y={66} width={13} height={4} rx={2}
          fill={GOLD} stroke={OUTLINE} strokeWidth={0.8} />
        <rect x={76} y={89} width={13} height={4} rx={2}
          fill={GOLD} stroke={OUTLINE} strokeWidth={0.8} />
        {/* Glove — chunkier */}
        <rect x={72} y={91} width={20} height={14} rx={8}
          fill={GLOVE} stroke={OUTLINE} strokeWidth={1.5} />
        <path d="M 73 98 Q 80 96 91 98"
          stroke="rgba(255,255,255,0.12)" strokeWidth={1}
          strokeLinecap="round" fill="none" />
      </g>

      {/* ═══════════════════════════════════════════════════════════
          HELMET (top layer)
          ═══════════════════════════════════════════════════════════ */}
      <g id="helmet">
        {/* Neck connector */}
        <rect x={36} y={54} width={28} height={8} rx={3}
          fill="#c5cad8" stroke={OUTLINE} strokeWidth={1.2} />

        {/* Red collar ring — wider */}
        <rect x={32} y={57} width={36} height={10} rx={4}
          fill="#dc2626" stroke={OUTLINE} strokeWidth={1.5} />

        {/* Helmet sphere — cx=50 cy=31 r=29 */}
        <circle cx={50} cy={31} r={29}
          fill="url(#lh)" stroke={OUTLINE} strokeWidth={1.5} />
        <path d="M 30 18 Q 42 8 62 14"
          stroke="rgba(255,255,255,0.40)" strokeWidth={1.8}
          strokeLinecap="round" fill="none" />

        {/* Gold ear piece — left — rx=5 ry=8 */}
        <ellipse cx={21} cy={31} rx={5} ry={8}
          fill={GOLD} stroke={OUTLINE} strokeWidth={1.5} />
        <ellipse cx={21} cy={29} rx={2.5} ry={3.5}
          fill="rgba(255,255,255,0.25)" />

        {/* Gold ear piece — right — rx=5 ry=8 */}
        <ellipse cx={79} cy={31} rx={5} ry={8}
          fill={GOLD} stroke={OUTLINE} strokeWidth={1.5} />
        <ellipse cx={79} cy={29} rx={2.5} ry={3.5}
          fill="rgba(255,255,255,0.25)" />

        {/* ── Visor (clipped group) — cx=50 cy=33 rx=22 ry=19 ── */}
        <g clipPath="url(#visorClip)">
          <ellipse cx={50} cy={33} rx={22} ry={19} fill="url(#lv)" />

          {VISOR_STARS.map((s, i) => (
            <circle key={i} cx={s.cx} cy={s.cy} r={s.r}
              fill="rgba(255,255,255,0.82)" />
          ))}

          {/* THE SWOOSH */}
          <path
            d="M 32 24 C 40 15 60 19 68 33"
            stroke="white"
            strokeWidth={4.5}
            strokeLinecap="round"
            opacity={0.6}
            fill="none"
          />

          <ellipse cx={39} cy={22} rx={6} ry={3.5}
            fill="rgba(255,255,255,0.18)" />
        </g>

        {/* Visor rim */}
        <ellipse cx={50} cy={33} rx={22} ry={19}
          fill="none"
          stroke="rgba(120,200,255,0.42)"
          strokeWidth={0.8} />
        {/* Visor outline */}
        <ellipse cx={50} cy={33} rx={22} ry={19}
          fill="none"
          stroke={OUTLINE}
          strokeWidth={1.2} />

        {/* Eyes at cy=38 */}
        {eyeVisible && (
          <>
            <circle cx={44} cy={38} r={2.8}
              fill="rgba(255,255,255,0.90)"
              style={{ transition: 'opacity 80ms linear' }} />
            <circle cx={56} cy={38} r={2.8}
              fill="rgba(255,255,255,0.90)"
              style={{ transition: 'opacity 80ms linear' }} />
            <circle cx={44.6} cy={38.5} r={1.3} fill="rgba(5,15,35,0.75)" />
            <circle cx={56.6} cy={38.5} r={1.3} fill="rgba(5,15,35,0.75)" />
          </>
        )}

        {/* Neck seal ring */}
        <ellipse cx={50} cy={60} rx={17} ry={4}
          fill="#c8cedd" stroke={OUTLINE} strokeWidth={1} />

        {founderBadge && (
          <g transform="translate(72,8) scale(0.65)">
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
