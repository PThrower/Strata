import type { Mood } from './types'

interface AstronautSVGProps {
  mood: Mood
  founderBadge?: boolean
  eyeVisible: boolean
  flamesActive?: boolean
}

// Stars placed inside visor ellipse (cx=50 cy=34 rx=19 ry=16) — all verified inside
const VISOR_STARS: Array<{ cx: number; cy: number; r: number }> = [
  { cx: 40, cy: 22, r: 1.0 },
  { cx: 50, cy: 21, r: 0.8 },
  { cx: 59, cy: 24, r: 0.9 },
  { cx: 63, cy: 29, r: 0.7 },
  { cx: 44, cy: 27, r: 0.7 },
  { cx: 56, cy: 32, r: 0.6 },
  { cx: 37, cy: 31, r: 0.8 },
  { cx: 62, cy: 38, r: 0.7 },
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

  // Depleted arm rotation pivots (top-center of each arm group)
  const leftArmTransform  = depleted ? 'rotate(28, 20, 62)' : undefined
  const rightArmTransform = depleted ? 'rotate(-28, 80, 62)' : undefined

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
        {/* Visor clip — must be first */}
        <clipPath id="visorClip">
          <ellipse cx="50" cy="34" rx="19" ry="16" />
        </clipPath>

        {/* Visor gradient */}
        <linearGradient id="lv" x1="50" y1="18" x2="50" y2="50" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#0a1628" />
          <stop offset="100%" stopColor="#1e4080" />
        </linearGradient>

        {/* Helmet gradient */}
        <linearGradient id="lh" x1="22" y1="4" x2="78" y2="60" gradientUnits="userSpaceOnUse">
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
        <linearGradient id="lal" x1="12" y1="62" x2="28" y2="88" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#e8edf6" />
          <stop offset="100%" stopColor="#b0bac8" />
        </linearGradient>
        <linearGradient id="lar" x1="88" y1="62" x2="72" y2="88" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#e8edf6" />
          <stop offset="100%" stopColor="#b0bac8" />
        </linearGradient>

        {/* Leg gradients */}
        <linearGradient id="lll" x1="35" y1="92" x2="49" y2="130" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#dde4f0" />
          <stop offset="100%" stopColor="#a8b2c2" />
        </linearGradient>
        <linearGradient id="llr" x1="65" y1="92" x2="51" y2="130" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#dde4f0" />
          <stop offset="100%" stopColor="#a8b2c2" />
        </linearGradient>

        {/* Flame gradient (objectBoundingBox so it scales per element) */}
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
        {/* Hump body */}
        <rect x={26} y={60} width={48} height={30} rx={13}
          fill="#7a8696" stroke={OUTLINE} strokeWidth={1.5} />
        {/* Gold accent band */}
        <rect x={30} y={68} width={40} height={4} rx={1}
          fill={GOLD} stroke={OUTLINE} strokeWidth={0.5} />
        {/* Highlight on hump top */}
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

        {/* Flames when active */}
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
          LEGS — left then right
          ═══════════════════════════════════════════════════════════ */}
      <g id="legs">
        {/* ── Left leg ── */}
        <rect x={35} y={92} width={14} height={24} rx={6}
          fill="url(#lll)" stroke={OUTLINE} strokeWidth={1.5} />
        {/* Left thigh ring */}
        <rect x={35} y={93} width={14} height={4} rx={2}
          fill={GOLD} stroke={OUTLINE} strokeWidth={0.8} />
        {/* Left knee pad */}
        <rect x={34} y={104} width={16} height={12} rx={4}
          fill="#6b7280" stroke={GOLD} strokeWidth={1.5} />
        <rect x={34} y={104} width={16} height={12} rx={4}
          fill="none" stroke={OUTLINE} strokeWidth={0.5} opacity={0.5} />
        {/* Left boot top ring */}
        <rect x={34} y={113} width={16} height={4} rx={2}
          fill={GOLD} stroke={OUTLINE} strokeWidth={0.8} />
        {/* Left boot */}
        <rect x={33} y={116} width={18} height={14} rx={5}
          fill={GLOVE} stroke={OUTLINE} strokeWidth={1.5} />
        {/* Boot toe highlight */}
        <ellipse cx={33+9} cy={127} rx={6} ry={2}
          fill="rgba(255,255,255,0.1)" />

        {/* ── Right leg ── */}
        <rect x={51} y={92} width={14} height={24} rx={6}
          fill="url(#llr)" stroke={OUTLINE} strokeWidth={1.5} />
        {/* Right thigh ring */}
        <rect x={51} y={93} width={14} height={4} rx={2}
          fill={GOLD} stroke={OUTLINE} strokeWidth={0.8} />
        {/* Right knee pad */}
        <rect x={50} y={104} width={16} height={12} rx={4}
          fill="#6b7280" stroke={GOLD} strokeWidth={1.5} />
        <rect x={50} y={104} width={16} height={12} rx={4}
          fill="none" stroke={OUTLINE} strokeWidth={0.5} opacity={0.5} />
        {/* Right boot top ring */}
        <rect x={50} y={113} width={16} height={4} rx={2}
          fill={GOLD} stroke={OUTLINE} strokeWidth={0.8} />
        {/* Right boot */}
        <rect x={49} y={116} width={18} height={14} rx={5}
          fill={GLOVE} stroke={OUTLINE} strokeWidth={1.5} />
        <ellipse cx={49+9} cy={127} rx={6} ry={2}
          fill="rgba(255,255,255,0.1)" />
      </g>

      {/* ═══════════════════════════════════════════════════════════
          TORSO + CHEST PANEL
          ═══════════════════════════════════════════════════════════ */}
      <g id="body">
        {/* Main torso */}
        <rect x={28} y={58} width={44} height={36} rx={12}
          fill="url(#ls)" stroke={OUTLINE} strokeWidth={1.5} />
        {/* Shoulder seam highlight */}
        <path d="M 34 60 Q 50 56 66 60"
          stroke="#eef1f8" strokeWidth={1.2}
          strokeLinecap="round" fill="none" opacity={0.65} />

        {/* Chest panel */}
        <rect x={35} y={66} width={30} height={20} rx={4}
          fill="#f0f4f8" stroke={OUTLINE} strokeWidth={1.5} />
        {/* Panel strap / divider line */}
        <rect x={35} y={74} width={30} height={2}
          fill={OUTLINE} opacity={0.18} />

        {/* Red indicator glow */}
        <ellipse cx={43} cy={78} rx={7} ry={7} fill="url(#rg)" opacity={0.9} />
        {/* Red indicator */}
        <circle cx={43} cy={78} r={4.5}
          fill="#dc2626" stroke={OUTLINE} strokeWidth={1} />
        <circle cx={41.5} cy={76.5} r={1.5} fill="rgba(255,255,255,0.45)" />

        {/* Gold indicator glow */}
        <ellipse cx={57} cy={78} rx={7} ry={7} fill="url(#ag)" opacity={0.9} />
        {/* Gold indicator */}
        <circle cx={57} cy={78} r={4.5}
          fill="#f59e0b" stroke={OUTLINE} strokeWidth={1} />
        <circle cx={55.5} cy={76.5} r={1.5} fill="rgba(255,255,255,0.45)" />
      </g>

      {/* ═══════════════════════════════════════════════════════════
          LEFT ARM
          ═══════════════════════════════════════════════════════════ */}
      <g id="leftArm" transform={leftArmTransform}>
        <rect x={12} y={62} width={16} height={26} rx={7}
          fill="url(#lal)" stroke={OUTLINE} strokeWidth={1.5} />
        {/* Upper arm / shoulder ring */}
        <rect x={13} y={63} width={14} height={4} rx={2}
          fill={GOLD} stroke={OUTLINE} strokeWidth={0.8} />
        {/* Wrist ring */}
        <rect x={13} y={83} width={14} height={4} rx={2}
          fill={GOLD} stroke={OUTLINE} strokeWidth={0.8} />
        {/* Glove */}
        <rect x={11} y={86} width={18} height={13} rx={7}
          fill={GLOVE} stroke={OUTLINE} strokeWidth={1.5} />
        {/* Glove knuckle line */}
        <path d="M 14 92 Q 20 90 26 92"
          stroke="rgba(255,255,255,0.12)" strokeWidth={1}
          strokeLinecap="round" fill="none" />
      </g>

      {/* ═══════════════════════════════════════════════════════════
          RIGHT ARM
          ═══════════════════════════════════════════════════════════ */}
      <g id="rightArm" transform={rightArmTransform}>
        <rect x={72} y={62} width={16} height={26} rx={7}
          fill="url(#lar)" stroke={OUTLINE} strokeWidth={1.5} />
        {/* Upper arm / shoulder ring */}
        <rect x={73} y={63} width={14} height={4} rx={2}
          fill={GOLD} stroke={OUTLINE} strokeWidth={0.8} />
        {/* Wrist ring */}
        <rect x={73} y={83} width={14} height={4} rx={2}
          fill={GOLD} stroke={OUTLINE} strokeWidth={0.8} />
        {/* Glove */}
        <rect x={71} y={86} width={18} height={13} rx={7}
          fill={GLOVE} stroke={OUTLINE} strokeWidth={1.5} />
        {/* Glove knuckle line */}
        <path d="M 74 92 Q 80 90 86 92"
          stroke="rgba(255,255,255,0.12)" strokeWidth={1}
          strokeLinecap="round" fill="none" />
      </g>

      {/* ═══════════════════════════════════════════════════════════
          HELMET (top layer)
          ═══════════════════════════════════════════════════════════ */}
      <g id="helmet">
        {/* Neck connector */}
        <rect x={38} y={56} width={24} height={8} rx={3}
          fill="#c5cad8" stroke={OUTLINE} strokeWidth={1.2} />

        {/* Red collar ring */}
        <rect x={35} y={57} width={30} height={7} rx={3}
          fill="#dc2626" stroke={OUTLINE} strokeWidth={1.5} />

        {/* Helmet sphere */}
        <circle cx={50} cy={32} r={28}
          fill="url(#lh)" stroke={OUTLINE} strokeWidth={1.5} />
        {/* Helmet top specular arc */}
        <path d="M 30 18 Q 42 8 62 14"
          stroke="rgba(255,255,255,0.40)" strokeWidth={1.8}
          strokeLinecap="round" fill="none" />

        {/* Gold ear piece — left */}
        <ellipse cx={22} cy={32} rx={4} ry={7}
          fill={GOLD} stroke={OUTLINE} strokeWidth={1.5} />
        <ellipse cx={22} cy={30} rx={2} ry={3}
          fill="rgba(255,255,255,0.25)" />

        {/* Gold ear piece — right */}
        <ellipse cx={78} cy={32} rx={4} ry={7}
          fill={GOLD} stroke={OUTLINE} strokeWidth={1.5} />
        <ellipse cx={78} cy={30} rx={2} ry={3}
          fill="rgba(255,255,255,0.25)" />

        {/* ── Visor (clipped group) ── */}
        <g clipPath="url(#visorClip)">
          {/* Visor fill */}
          <ellipse cx={50} cy={34} rx={19} ry={16} fill="url(#lv)" />

          {/* Star field */}
          {VISOR_STARS.map((s, i) => (
            <circle key={i} cx={s.cx} cy={s.cy} r={s.r}
              fill="rgba(255,255,255,0.82)" />
          ))}

          {/* THE SWOOSH — approved: d="M 35 25 C 41 18 58 20 65 31" */}
          <path
            d="M 35 25 C 41 18 58 20 65 31"
            stroke="white"
            strokeWidth={3.5}
            strokeLinecap="round"
            opacity={0.55}
            fill="none"
          />

          {/* Small secondary specular fill */}
          <ellipse cx={40} cy={25} rx={5} ry={3}
            fill="rgba(255,255,255,0.18)" />
        </g>

        {/* Visor rim — ice-blue stroke, outside clip */}
        <ellipse cx={50} cy={34} rx={19} ry={16}
          fill="none"
          stroke="rgba(120,200,255,0.42)"
          strokeWidth={0.8} />
        {/* Visor outline */}
        <ellipse cx={50} cy={34} rx={19} ry={16}
          fill="none"
          stroke={OUTLINE}
          strokeWidth={1.2} />

        {/* Eyes — visible when eyeVisible */}
        {eyeVisible && (
          <>
            <circle cx={44} cy={36} r={2.8}
              fill="rgba(255,255,255,0.90)"
              style={{ transition: 'opacity 80ms linear' }} />
            <circle cx={56} cy={36} r={2.8}
              fill="rgba(255,255,255,0.90)"
              style={{ transition: 'opacity 80ms linear' }} />
            <circle cx={44.6} cy={36.5} r={1.3} fill="rgba(5,15,35,0.75)" />
            <circle cx={56.6} cy={36.5} r={1.3} fill="rgba(5,15,35,0.75)" />
          </>
        )}

        {/* Neck seal ring */}
        <ellipse cx={50} cy={59} rx={14} ry={3.5}
          fill="#c8cedd" stroke={OUTLINE} strokeWidth={1} />

        {/* Founder gold star — top-right of helmet */}
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
