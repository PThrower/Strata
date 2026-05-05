'use client'

import { useEffect, useState } from 'react'

interface UsageBarProps {
  pct: number          // 0–100
  resetDate: string
}

export function UsageBar({ pct, resetDate }: UsageBarProps) {
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const raf = requestAnimationFrame(() => setWidth(pct))
    return () => cancelAnimationFrame(raf)
  }, [pct])

  const barColor =
    pct >= 100 ? '#ef4444' :
    pct >= 86  ? '#f59e0b' :
                 '#00c472'

  const glowColor =
    pct >= 100 ? 'rgba(239,68,68,0.55)' :
    pct >= 86  ? 'rgba(245,158,11,0.55)' :
                 'rgba(0,196,114,0.55)'

  return (
    <div>
      <p style={{
        fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 500,
        letterSpacing: '0.15em', textTransform: 'uppercase',
        color: 'var(--ink-faint)', margin: '0 0 10px',
      }}>
        monthly usage
      </p>
      <div style={{
        width: '100%', height: 6, borderRadius: 999,
        background: 'rgba(255,255,255,0.08)', overflow: 'hidden',
      }}>
        <div style={{
          width: `${width}%`,
          height: '100%', borderRadius: 999,
          background: barColor,
          boxShadow: `0 0 8px ${glowColor}`,
          transition: 'width 800ms ease-out',
        }} />
      </div>
      <p style={{
        fontFamily: 'var(--font-mono)', fontSize: 11,
        color: 'var(--ink-faint)', marginTop: 8,
      }}>
        resets on: {resetDate}
      </p>
    </div>
  )
}
