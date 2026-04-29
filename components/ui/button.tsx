import Link from 'next/link'
import type { CSSProperties, ReactNode } from 'react'

type ButtonVariant = 'emerald' | 'ghost' | 'white' | 'outline'

interface BtnProps {
  variant: ButtonVariant
  href?: string
  arrow?: boolean
  className?: string
  style?: CSSProperties
  children: ReactNode
  onClick?: () => void
}

export function Btn({ variant, href, arrow = true, className, style, children, onClick }: BtnProps) {
  const cls = ['mkt-btn', `btn-${variant}`, className].filter(Boolean).join(' ')
  const content = (
    <>
      {children}
      {arrow && <span className="btn-arrow">→</span>}
    </>
  )

  if (href) {
    const isExternal = href.startsWith('http')
    if (isExternal) {
      return (
        <a href={href} className={cls} style={style} target="_blank" rel="noopener noreferrer">
          {content}
        </a>
      )
    }
    return (
      <Link href={href} className={cls} style={style}>
        {content}
      </Link>
    )
  }

  return (
    <button type="button" className={cls} style={style} onClick={onClick}>
      {content}
    </button>
  )
}
