import type { RiskLevel } from '@/lib/risk'

const BASE: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: '6px',
  padding: '4px 10px', borderRadius: '999px',
  fontFamily: 'var(--font-mono)', fontSize: '10.5px', fontWeight: 500,
  letterSpacing: '0.14em', textTransform: 'uppercase',
  border: '1px solid', whiteSpace: 'nowrap',
}

const STYLES: Record<string, React.CSSProperties> = {
  low:      { ...BASE, color: '#00c472', background: 'rgba(0,196,114,0.10)',   borderColor: 'rgba(0,196,114,0.32)' },
  medium:   { ...BASE, color: '#f5b042', background: 'rgba(245,176,66,0.10)',  borderColor: 'rgba(245,176,66,0.32)' },
  high:     { ...BASE, color: '#ff7a45', background: 'rgba(255,122,69,0.10)',  borderColor: 'rgba(255,122,69,0.32)' },
  critical: { ...BASE, color: '#ffffff', background: 'rgba(239,68,68,0.85)',   borderColor: 'rgba(239,68,68,1)' },
  unknown:  { ...BASE, color: '#888888', background: 'rgba(136,136,136,0.10)', borderColor: 'rgba(136,136,136,0.30)' },
}

export function RiskBadge({ level }: { level: RiskLevel | string | null | undefined }) {
  const key = (level ?? 'unknown') as string
  const style = STYLES[key] ?? STYLES.unknown
  return <span style={style}>● {key}</span>
}
