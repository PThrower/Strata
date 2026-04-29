import type { ReactNode } from 'react'
import Link from 'next/link'
import { Btn } from '@/components/ui/button'

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mkt-bg">
      <div className="relative" style={{ zIndex: 2 }}>
        {/* Floating glass nav — sticky at top:16px */}
        <div className="sticky top-4 z-50 px-4 sm:px-8">
          <nav
            className="glass max-w-[1200px] mx-auto flex items-center justify-between"
            style={{ height: 64, borderRadius: 22, padding: '0 14px 0 22px' }}
          >
            <Link
              href="/"
              className="flex items-center gap-3"
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 22,
                fontWeight: 400,
                letterSpacing: '0.18em',
                color: 'var(--ink)',
                textDecoration: 'none',
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 9, height: 9, borderRadius: '50%',
                  background: 'var(--emerald-glow)', flexShrink: 0, display: 'inline-block',
                  boxShadow: [
                    'inset 0 0 0 1px rgba(255,255,255,0.40)',
                    '0 0 14px rgba(95,176,133,0.95)',
                    '0 0 28px rgba(95,176,133,0.55)',
                  ].join(', '),
                }}
              />
              <span>
                <span style={{ textTransform: 'uppercase' }}>S</span>
                <span style={{ textTransform: 'lowercase' }}>trata</span>
              </span>
            </Link>

            <div className="flex items-center gap-7">
              <Link href="/docs"    className="mkt-nav-link hidden sm:block">docs</Link>
              <a    href="#pricing" className="mkt-nav-link hidden sm:block">pricing</a>
              <Btn variant="emerald" href="/signup">get api key</Btn>
            </div>
          </nav>
        </div>

        <div className="max-w-[1200px] mx-auto px-4 sm:px-8">
          {children}
        </div>

        <footer className="max-w-[1200px] mx-auto px-4 sm:px-8" style={{ margin: '96px auto 32px' }}>
          <div
            className="glass flex items-center justify-between"
            style={{ padding: '22px 28px', borderRadius: 22 }}
          >
            <span style={{
              fontFamily: 'var(--font-serif)',
              fontStyle: 'italic',
              fontSize: 19,
              letterSpacing: '-0.015em',
              color: 'var(--ink)',
            }}>
              knowledge that holds.
            </span>
            <span className="hidden sm:block" style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              fontWeight: 500,
              letterSpacing: '0.10em',
              color: 'var(--ink-faint)',
            }}>
              strata.dev
              <span style={{ color: 'rgba(255,255,255,0.25)', margin: '0 8px' }}>·</span>
              docs
              <span style={{ color: 'rgba(255,255,255,0.25)', margin: '0 8px' }}>·</span>
              status
            </span>
          </div>
        </footer>
      </div>
    </div>
  )
}
