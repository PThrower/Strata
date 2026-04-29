import type { CSSProperties, ElementType, ReactNode } from 'react'

interface GlassProps {
  shimmer?: boolean
  as?: ElementType
  className?: string
  style?: CSSProperties
  children: ReactNode
}

export function Glass({ shimmer, as: Tag = 'div', className, style, children }: GlassProps) {
  const cls = ['glass', shimmer && 'shimmer', className].filter(Boolean).join(' ')
  return (
    <Tag className={cls} style={style}>
      {children}
    </Tag>
  )
}
