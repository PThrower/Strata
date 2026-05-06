import type { RiskLevel } from '@/lib/risk'

const RISK: Record<string, { bg: string; color: string }> = {
  low:      { bg: 'rgba(0,196,114,0.12)',   color: '#00c472' },
  medium:   { bg: 'rgba(245,158,11,0.12)',  color: '#f59e0b' },
  high:     { bg: 'rgba(249,115,22,0.12)',  color: '#f97316' },
  critical: { bg: 'rgba(239,68,68,0.12)',   color: '#ef4444' },
  unknown:  { bg: 'rgba(255,255,255,0.06)', color: 'var(--ink-faint)' },
}

export function RiskBadge({ level }: { level: RiskLevel | string | null | undefined }) {
  const key = (level ?? 'unknown') as string
  const { bg, color } = RISK[key] ?? RISK.unknown
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 8px', borderRadius: 999,
      fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 500,
      background: bg, color, whiteSpace: 'nowrap',
    }}>
      {key}
    </span>
  )
}
