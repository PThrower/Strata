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
              style={{ textDecoration: 'none' }}
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
              <span
                className="brand-gradient-text"
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: 22,
                  fontWeight: 400,
                  letterSpacing: '0.18em',
                }}
              >
                <span style={{ textTransform: 'uppercase' }}>S</span>
                <span style={{ textTransform: 'lowercase' }}>trata</span>
              </span>
            </Link>

            <div className="flex items-center gap-7">
              <Link href="/docs"           className="mkt-nav-link hidden sm:block">docs</Link>
              <Link href="/docs/sdk"       className="mkt-nav-link hidden sm:block">sdk</Link>
              <Link href="/how-it-works"  className="mkt-nav-link hidden sm:block">how it works</Link>
              <Link href="/submit-mcp"    className="mkt-nav-link hidden sm:block">submit mcp</Link>
              <Link href="/#pricing"      className="mkt-nav-link hidden sm:block">pricing</Link>
              <Btn variant="emerald" href="/signup">get api key</Btn>
            </div>
          </nav>
        </div>

        <div className="max-w-[1200px] mx-auto px-4 sm:px-8">
          {children}
        </div>

        <footer className="max-w-[1200px] mx-auto px-4 sm:px-8" style={{ margin: '96px auto 32px' }}>
          <div
            className="glass flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-0"
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
            <span className="flex flex-wrap justify-center sm:justify-start items-center" style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: '0.08em',
              color: 'var(--ink-faint)',
              gap: 0,
            }}>
              {[
                { label: '© 2026 Strata™', href: null },
                { label: 'Terms',          href: '/terms' },
                { label: 'Privacy',        href: '/privacy' },
                { label: 'docs',           href: '/docs' },
                { label: 'sdk',            href: '/docs/sdk' },
                { label: 'support@usestrata.dev', href: 'mailto:support@usestrata.dev' },
              ].map(({ label, href }, i) => (
                <span key={label} className="flex items-center">
                  {i > 0 && <span style={{ color: 'rgba(255,255,255,0.20)', margin: '0 7px' }}>·</span>}
                  {href ? (
                    <Link href={href} className="footer-link" style={{ color: 'var(--ink-faint)', textDecoration: 'none' }}>
                      {label}
                    </Link>
                  ) : (
                    <span>{label}</span>
                  )}
                </span>
              ))}
            </span>
          </div>
        </footer>
      </div>
    </div>
  )
}
