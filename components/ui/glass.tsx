import type { CSSProperties, ElementType, ReactNode } from 'react'

type GlassTint   = 'neutral' | 'emerald'
type GlassRadius = 'sm' | 'md' | 'lg' | 'xl' | 'pill'

interface GlassProps {
  shimmer?: boolean
  tint?: GlassTint
  radius?: GlassRadius
  elevated?: boolean
  as?: ElementType
  className?: string
  style?: CSSProperties
  children: ReactNode
}

const RADIUS: Record<GlassRadius, number> = {
  sm:   14,
  md:   22,
  lg:   24,
  xl:   26,
  pill: 999,
}

export function Glass({
  shimmer,
  tint = 'neutral',
  radius = 'lg',
  elevated = true,
  as: Tag = 'div',
  className,
  style,
  children,
}: GlassProps) {
  const cls = [
    'glass',
    shimmer  && 'shimmer',
    tint === 'emerald' && 'glass-tint-emerald',
    !elevated && 'glass-flat',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <Tag
      className={cls}
      style={{ borderRadius: RADIUS[radius], ...style }}
    >
      {children}
    </Tag>
  )
}
