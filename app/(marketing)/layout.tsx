import type { ReactNode } from 'react'
import Link from 'next/link'
import { MarketingHeader } from '@/components/ui/marketing-header'

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mkt-bg">
      <div className="relative" style={{ zIndex: 2 }}>
        <MarketingHeader />

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
