import type { Mood } from './types'

interface AstronautSVGProps {
  mood: Mood
  founderBadge?: boolean
  eyeVisible: boolean
  flamesActive?: boolean
}

// 12 stars verified inside visor (cx=60 cy=36 rx=26 ry=23)
const VISOR_STARS: Array<{ cx: number; cy: number; r: number }> = [
  { cx: 46, cy: 24, r: 1.0 },
  { cx: 62, cy: 22, r: 0.8 },
  { cx: 74, cy: 27, r: 0.9 },
  { cx: 80, cy: 35, r: 0.7 },
  { cx: 52, cy: 30, r: 0.7 },
  { cx: 68, cy: 32, r: 0.6 },
  { cx: 44, cy: 35, r: 0.8 },
  { cx: 78, cy: 46, r: 0.7 },
  { cx: 42, cy: 45, r: 0.8 },
  { cx: 57, cy: 54, r: 0.6 },
  { cx: 72, cy: 52, r: 0.7 },
  { cx: 66, cy: 28, r: 0.6 },
]

const OUTLINE = '#1a1a2e'
const GOLD    = '#c8920a'
const GLOVE   = '#4a5568'
const KNEECOL = '#6b7a9e'

export function AstronautSVG({
  mood,
  founderBadge,
  eyeVisible,
  flamesActive = false,
}: AstronautSVGProps) {
  const depleted = mood === 'depleted'
  const glowAlpha = depleted ? 0.10 : 0.32

  return (
    <svg
      width={90} height={120}
      viewBox="0 0 120 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      data-mood={mood}
      style={{
        filter: `drop-shadow(0 0 8px rgba(95,176,133,${glowAlpha}))`,
        overflow: 'visible',
      }}
      aria-hidden="true"
    >
      <defs>
        {/* Visor clip — cx=60 cy=36 rx=26 ry=23 */}
        <clipPath id="visorClip">
          <ellipse cx="60" cy="36" rx="26" ry="23" />
        </clipPath>

        {/* Visor gradient */}
        <linearGradient id="lv" x1="60" y1="13" x2="60" y2="59" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#0a1628" />
          <stop offset="100%" stopColor="#1e4080" />
        </linearGradient>

        {/* Helmet gradient */}
        <linearGradient id="lh" x1="24" y1="-2" x2="96" y2="70" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#eef1f8" />
          <stop offset="60%"  stopColor="#dde4f0" />
          <stop offset="100%" stopColor="#b8c4d4" />
        </linearGradient>

        {/* Suit torso gradient */}
        <linearGradient id="ls" x1="32" y1="70" x2="88" y2="114" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#eef1f8" />
          <stop offset="55%"  stopColor="#dde4f0" />
          <stop offset="100%" stopColor="#b4bece" />
        </linearGradient>

        {/* Left arm gradient */}
        <linearGradient id="lal" x1="12" y1="74" x2="30" y2="108" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#e8edf6" />
          <stop offset="100%" stopColor="#b0bac8" />
        </linearGradient>

        {/* Right arm gradient */}
        <linearGradient id="lar" x1="108" y1="74" x2="90" y2="108" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#e8edf6" />
          <stop offset="100%" stopColor="#b0bac8" />
        </linearGradient>

        {/* Left leg gradient */}
        <linearGradient id="lll" x1="36" y1="112" x2="54" y2="160" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#dde4f0" />
          <stop offset="100%" stopColor="#a8b2c2" />
        </linearGradient>

        {/* Right leg gradient */}
        <linearGradient id="llr" x1="84" y1="112" x2="66" y2="160" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#dde4f0" />
          <stop offset="100%" stopColor="#a8b2c2" />
        </linearGradient>

        {/* Jetpack gradient */}
        <linearGradient id="lj" x1="34" y1="72" x2="86" y2="112" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#8a96a6" />
          <stop offset="100%" stopColor="#6a7686" />
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
          BODY TILT GROUP — torso+arms+legs tilt 2deg for personality.
          Helmet stays outside (upright).
          ═══════════════════════════════════════════════════════════ */}
      <g transform="rotate(2, 60, 110)">

        {/* ── Jetpack — behind torso ── */}
        <g id="jetpack">
          <rect x={34} y={72} width={52} height={40} rx={14}
            fill="url(#lj)" stroke={OUTLINE} strokeWidth={1.5} />
          <rect x={38} y={82} width={44} height={5} rx={2}
            fill={GOLD} stroke={OUTLINE} strokeWidth={0.5} />
          <path d="M 40 74 Q 60 70 80 74"
            stroke="rgba(255,255,255,0.22)" strokeWidth={1.4}
            strokeLinecap="round" fill="none" />
          {/* Left nozzle */}
          <ellipse cx={42} cy={115} rx={7} ry={5}
            fill="#2e3540" stroke={OUTLINE} strokeWidth={1} />
          <ellipse cx={42} cy={115} rx={4.5} ry={3} fill="#1a2028" />
          {/* Right nozzle */}
          <ellipse cx={78} cy={115} rx={7} ry={5}
            fill="#2e3540" stroke={OUTLINE} strokeWidth={1} />
          <ellipse cx={78} cy={115} rx={4.5} ry={3} fill="#1a2028" />
          {flamesActive && (
            <>
              <ellipse cx={42} cy={126} rx={5.5} ry={10}
                fill="url(#lf)"
                style={{ animation: 'jetpack-flame 120ms ease-in-out infinite alternate' }}
              />
              <ellipse cx={78} cy={126} rx={5.5} ry={10}
                fill="url(#lf)"
                style={{ animation: 'jetpack-flame 120ms ease-in-out infinite alternate', animationDelay: '60ms' }}
              />
            </>
          )}
        </g>

        {/* ── Left leg — CSS handles 5deg tilt via #larry-leg-left ── */}
        <g id="larry-leg-left">
          <rect x={36} y={112} width={18} height={24} rx={7}
            fill="url(#lll)" stroke={OUTLINE} strokeWidth={1.5} />
          {/* Thigh ring */}
          <rect x={36} y={116} width={18} height={5} rx={2}
            fill={GOLD} stroke={OUTLINE} strokeWidth={0.8} />
          {/* Knee pad — large, blue-gray */}
          <rect x={33} y={126} width={24} height={18} rx={7}
            fill={KNEECOL} stroke={GOLD} strokeWidth={1.5} />
          <rect x={33} y={126} width={24} height={18} rx={7}
            fill="none" stroke={OUTLINE} strokeWidth={0.5} opacity={0.5} />
          {/* Boot ring */}
          <rect x={33} y={141} width={24} height={6} rx={2}
            fill={GOLD} stroke={OUTLINE} strokeWidth={0.8} />
          {/* Boot */}
          <rect x={32} y={146} width={26} height={14} rx={8}
            fill={GLOVE} stroke={OUTLINE} strokeWidth={1.5} />
          <ellipse cx={45} cy={158} rx={9} ry={3}
            fill="rgba(255,255,255,0.10)" />
        </g>

        {/* ── Right leg — CSS handles -3deg tilt via #larry-leg-right ── */}
        <g id="larry-leg-right">
          <rect x={66} y={112} width={18} height={24} rx={7}
            fill="url(#llr)" stroke={OUTLINE} strokeWidth={1.5} />
          <rect x={66} y={116} width={18} height={5} rx={2}
            fill={GOLD} stroke={OUTLINE} strokeWidth={0.8} />
          <rect x={63} y={126} width={24} height={18} rx={7}
            fill={KNEECOL} stroke={GOLD} strokeWidth={1.5} />
          <rect x={63} y={126} width={24} height={18} rx={7}
            fill="none" stroke={OUTLINE} strokeWidth={0.5} opacity={0.5} />
          <rect x={63} y={141} width={24} height={6} rx={2}
            fill={GOLD} stroke={OUTLINE} strokeWidth={0.8} />
          <rect x={62} y={146} width={26} height={14} rx={8}
            fill={GLOVE} stroke={OUTLINE} strokeWidth={1.5} />
          <ellipse cx={75} cy={158} rx={9} ry={3}
            fill="rgba(255,255,255,0.10)" />
        </g>

        {/* ── Torso + chest panel ── */}
        <g id="body">
          <rect x={32} y={70} width={56} height={44} rx={14}
            fill="url(#ls)" stroke={OUTLINE} strokeWidth={1.5} />
          <path d="M 36 72 Q 60 68 84 72"
            stroke="#eef1f8" strokeWidth={1.2}
            strokeLinecap="round" fill="none" opacity={0.65} />

          {/* Chest panel */}
          <rect x={40} y={79} width={40} height={26} rx={5}
            fill="#f0f4f8" stroke={OUTLINE} strokeWidth={1.5} />
          {/* Panel divider */}
          <rect x={40} y={90} width={40} height={2}
            fill={OUTLINE} opacity={0.18} />

          {/* Chest strap cord */}
          <path d="M 60 105 Q 57 111 52 115"
            stroke={OUTLINE} strokeWidth={0.8}
            strokeLinecap="round" fill="none" opacity={0.35} />

          {/* Red indicator */}
          <ellipse cx={53} cy={96} rx={8} ry={8} fill="url(#rg)" opacity={0.8} />
          <circle cx={53} cy={96} r={5}
            fill="#dc2626" stroke={OUTLINE} strokeWidth={1} />
          <circle cx={51.5} cy={94.5} r={1.8} fill="rgba(255,255,255,0.45)" />

          {/* Gold indicator */}
          <ellipse cx={67} cy={96} rx={8} ry={8} fill="url(#ag)" opacity={0.8} />
          <circle cx={67} cy={96} r={5}
            fill="#f59e0b" stroke={OUTLINE} strokeWidth={1} />
          <circle cx={65.5} cy={94.5} r={1.8} fill="rgba(255,255,255,0.45)" />
        </g>

        {/* ── Left arm — CSS handles 8deg rotation + flight swing ── */}
        <g id="larry-arm-left">
          <rect x={12} y={74} width={18} height={34} rx={8}
            fill="url(#lal)" stroke={OUTLINE} strokeWidth={1.5} />
          {/* Upper arm ring */}
          <rect x={13} y={82} width={16} height={5} rx={2}
            fill={GOLD} stroke={OUTLINE} strokeWidth={0.8} />
          {/* Wrist ring */}
          <rect x={13} y={100} width={16} height={5} rx={2}
            fill={GOLD} stroke={OUTLINE} strokeWidth={0.8} />
          {/* Glove */}
          <rect x={10} y={106} width={22} height={16} rx={9}
            fill={GLOVE} stroke={OUTLINE} strokeWidth={1.5} />
          <path d="M 13 114 Q 21 112 31 114"
            stroke="rgba(255,255,255,0.12)" strokeWidth={1}
            strokeLinecap="round" fill="none" />
        </g>

        {/* ── Right arm — CSS handles -5deg rotation + flight swing ── */}
        <g id="larry-arm-right">
          <rect x={90} y={74} width={18} height={34} rx={8}
            fill="url(#lar)" stroke={OUTLINE} strokeWidth={1.5} />
          {/* Upper arm ring */}
          <rect x={91} y={82} width={16} height={5} rx={2}
            fill={GOLD} stroke={OUTLINE} strokeWidth={0.8} />
          {/* Wrist ring */}
          <rect x={91} y={100} width={16} height={5} rx={2}
            fill={GOLD} stroke={OUTLINE} strokeWidth={0.8} />
          {/* Glove */}
          <rect x={88} y={106} width={22} height={16} rx={9}
            fill={GLOVE} stroke={OUTLINE} strokeWidth={1.5} />
          <path d="M 89 114 Q 99 112 109 114"
            stroke="rgba(255,255,255,0.12)" strokeWidth={1}
            strokeLinecap="round" fill="none" />
        </g>

      </g>{/* end body tilt */}

      {/* ═══════════════════════════════════════════════════════════
          HELMET — outside body tilt, always upright
          ═══════════════════════════════════════════════════════════ */}
      <g id="helmet">
        {/* Neck connector */}
        <rect x={46} y={62} width={28} height={10} rx={4}
          fill="#c5cad8" stroke={OUTLINE} strokeWidth={1.2} />

        {/* Red collar */}
        <rect x={38} y={67} width={44} height={12} rx={5}
          fill="#dc2626" stroke={OUTLINE} strokeWidth={1.5} />

        {/* Helmet sphere — cx=60 cy=34 r=36 */}
        <circle cx={60} cy={34} r={36}
          fill="url(#lh)" stroke={OUTLINE} strokeWidth={1.5} />
        <path d="M 32 18 Q 50 8 76 14"
          stroke="rgba(255,255,255,0.40)" strokeWidth={2}
          strokeLinecap="round" fill="none" />

        {/* Gold ear piece — left — cx=24 cy=34 rx=6 ry=9 */}
        <ellipse cx={24} cy={34} rx={6} ry={9}
          fill={GOLD} stroke={OUTLINE} strokeWidth={1.5} />
        <ellipse cx={24} cy={31} rx={3} ry={4}
          fill="rgba(255,255,255,0.25)" />

        {/* Gold ear piece — right — cx=96 cy=34 rx=6 ry=9 */}
        <ellipse cx={96} cy={34} rx={6} ry={9}
          fill={GOLD} stroke={OUTLINE} strokeWidth={1.5} />
        <ellipse cx={96} cy={31} rx={3} ry={4}
          fill="rgba(255,255,255,0.25)" />

        {/* ── Visor (clipped) ── */}
        <g clipPath="url(#visorClip)">
          <ellipse cx={60} cy={36} rx={26} ry={23} fill="url(#lv)" />

          {VISOR_STARS.map((s, i) => (
            <circle key={i} cx={s.cx} cy={s.cy} r={s.r}
              fill="rgba(255,255,255,0.82)" />
          ))}

          {/* Swoosh — starts outside clip, clipped at visor rim naturally */}
          <path
            d="M 36 24 C 47 11 74 16 84 33"
            stroke="white"
            strokeWidth={5.5}
            strokeLinecap="round"
            opacity={0.6}
            fill="none"
          />

          {/* Specular fill */}
          <ellipse cx={47} cy={26} rx={7} ry={4}
            fill="rgba(255,255,255,0.18)" />
        </g>

        {/* Visor rim — ice-blue */}
        <ellipse cx={60} cy={36} rx={26} ry={23}
          fill="none"
          stroke="rgba(120,200,255,0.42)"
          strokeWidth={0.9} />
        {/* Visor outline */}
        <ellipse cx={60} cy={36} rx={26} ry={23}
          fill="none"
          stroke={OUTLINE}
          strokeWidth={1.3} />

        {/* Eyes at cy=44 */}
        {eyeVisible && (
          <>
            <circle cx={53} cy={44} r={3.2}
              fill="rgba(255,255,255,0.90)"
              style={{ transition: 'opacity 80ms linear' }} />
            <circle cx={67} cy={44} r={3.2}
              fill="rgba(255,255,255,0.90)"
              style={{ transition: 'opacity 80ms linear' }} />
            <circle cx={53.8} cy={44.5} r={1.4} fill="rgba(5,15,35,0.75)" />
            <circle cx={67.8} cy={44.5} r={1.4} fill="rgba(5,15,35,0.75)" />
          </>
        )}

        {/* Neck seal ring */}
        <ellipse cx={60} cy={77} rx={20} ry={5}
          fill="#c8cedd" stroke={OUTLINE} strokeWidth={1} />

        {/* Founder gold star */}
        {founderBadge && (
          <g transform="translate(88, 8) scale(0.70)">
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
