import Link from 'next/link'
import type { ReactNode } from 'react'

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mkt-bg">
      <div className="mkt-grain" aria-hidden="true" />

      <div className="relative" style={{ zIndex: 2 }}>
        {/* Floating glass nav — sticky at top:16px */}
        <div className="sticky top-4 z-50 px-4 sm:px-8">
          <nav
            className="glass max-w-[1200px] mx-auto flex items-center justify-between"
            style={{ height: 64, borderRadius: 22, padding: '0 22px 0 24px' }}
          >
            <Link
              href="/"
              className="flex items-center gap-3"
              style={{ fontFamily: 'var(--font-serif), Georgia, serif', fontSize: 19, letterSpacing: '-0.01em', color: 'var(--ink)', textDecoration: 'none' }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 9, height: 9, borderRadius: '50%',
                  background: 'var(--emerald-bright)', flexShrink: 0, display: 'inline-block',
                  boxShadow: '0 0 0 1px rgba(255,255,255,0.35) inset, 0 0 12px rgba(95,176,133,0.85), 0 0 24px rgba(95,176,133,0.45)',
                }}
              />
              Strata
            </Link>

            <div className="flex items-center gap-[26px]">
              <Link href="/docs" className="mkt-nav-link">docs</Link>
              <a href="#pricing" className="mkt-nav-link">pricing</a>
              <Link href="/signup" className="mkt-btn btn-emerald">
                get api key <span className="btn-arrow">→</span>
              </Link>
            </div>
          </nav>
        </div>

        <div className="max-w-[1200px] mx-auto px-4 sm:px-8">
          {children}
        </div>

        <footer className="max-w-[1200px] mx-auto px-4 sm:px-8 mt-20 mb-7">
          <div
            className="glass flex items-center justify-between"
            style={{ padding: '20px 28px', borderRadius: 22 }}
          >
            <span style={{ fontFamily: 'var(--font-serif), Georgia, serif', fontStyle: 'italic', fontSize: 17, letterSpacing: '-0.01em', color: 'var(--ink)' }}>
              knowledge that holds.
            </span>
            <span className="hidden sm:block" style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.08em', color: 'var(--ink-faint)' }}>
              strata.dev
              <span style={{ color: 'rgba(255,255,255,0.28)', margin: '0 8px' }}>·</span>
              docs
              <span style={{ color: 'rgba(255,255,255,0.28)', margin: '0 8px' }}>·</span>
              status
            </span>
          </div>
        </footer>
      </div>
    </div>
  )
}
