'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Btn } from '@/components/ui/button'

const NAV_LINKS = [
  { label: 'docs',         href: '/docs' },
  { label: 'sdk',          href: '/docs/sdk' },
  { label: 'how it works', href: '/how-it-works' },
  { label: 'submit mcp',   href: '/submit-mcp' },
  { label: 'pricing',      href: '/#pricing' },
]

export function MarketingHeader() {
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  function close() { setOpen(false) }

  return (
    <>
      <div className="sticky top-4 z-50 px-4 sm:px-8">
        <nav
          className="glass max-w-[1200px] mx-auto flex items-center justify-between"
          style={{ height: 64, borderRadius: 22, padding: '0 14px 0 22px' }}
        >
          {/* Brand */}
          <Link href="/" className="flex items-center gap-3" style={{ textDecoration: 'none' }}>
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
              style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 400, letterSpacing: '0.18em' }}
            >
              <span style={{ textTransform: 'uppercase' }}>S</span>
              <span style={{ textTransform: 'lowercase' }}>trata</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="flex items-center gap-7">
            <Link href="/docs"          className="mkt-nav-link hidden sm:block">docs</Link>
            <Link href="/docs/sdk"      className="mkt-nav-link hidden sm:block">sdk</Link>
            <Link href="/how-it-works"  className="mkt-nav-link hidden sm:block">how it works</Link>
            <Link href="/submit-mcp"    className="mkt-nav-link hidden sm:block">submit mcp</Link>
            <Link href="/#pricing"      className="mkt-nav-link hidden sm:block">pricing</Link>
            <span className="hidden sm:inline-flex">
              <Btn variant="emerald" href="/signup">get api key</Btn>
            </span>

            {/* Hamburger — mobile only */}
            <button
              ref={btnRef}
              onClick={() => setOpen(v => !v)}
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
              className="sm:hidden"
              style={{
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: 5, background: 'none', border: 'none',
                cursor: 'pointer', padding: '10px 8px',
                minWidth: 36, minHeight: 44,
              }}
            >
              {open ? (
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                  <line x1="2" y1="2" x2="16" y2="16" stroke="var(--emerald-glow)" strokeWidth="2" strokeLinecap="round" />
                  <line x1="16" y1="2" x2="2" y2="16" stroke="var(--emerald-glow)" strokeWidth="2" strokeLinecap="round" />
                </svg>
              ) : (
                <>
                  <span style={{ width: 20, height: 2, borderRadius: 2, background: 'var(--ink-muted)', display: 'block' }} />
                  <span style={{ width: 20, height: 2, borderRadius: 2, background: 'var(--ink-muted)', display: 'block' }} />
                  <span style={{ width: 14, height: 2, borderRadius: 2, background: 'var(--ink-muted)', display: 'block' }} />
                </>
              )}
            </button>
          </div>
        </nav>
      </div>

      {/* ── Full-screen drawer overlay (mobile only) ── */}
      {open && (
        <div
          className="sm:hidden"
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            display: 'flex', justifyContent: 'flex-end',
          }}
        >
          {/* Backdrop */}
          <div
            onClick={close}
            style={{
              position: 'absolute', inset: 0,
              background: 'rgba(5,6,13,0.70)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
            }}
          />

          {/* Drawer */}
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            style={{
              position: 'relative', zIndex: 1,
              width: 'min(300px, 88vw)',
              height: '100%',
              background: 'rgba(5,6,13,0.96)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              borderLeft: '1px solid var(--hair)',
              display: 'flex', flexDirection: 'column',
            }}
          >
            {/* Drawer header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '20px 20px 16px',
              borderBottom: '1px solid var(--hair)',
            }}>
              <Link
                href="/"
                onClick={close}
                className="brand-gradient-text"
                style={{
                  fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 400,
                  letterSpacing: '0.18em', textDecoration: 'none',
                }}
              >
                <span style={{ textTransform: 'uppercase' }}>S</span>
                <span style={{ textTransform: 'lowercase' }}>trata</span>
              </Link>
              <button
                onClick={close}
                aria-label="Close menu"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--ink-faint)', fontSize: 20,
                  width: 40, height: 40, borderRadius: 8,
                }}
              >
                ✕
              </button>
            </div>

            {/* Nav links */}
            <nav style={{ flex: 1, padding: '8px 0' }}>
              {NAV_LINKS.map(({ label, href }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={close}
                  style={{
                    display: 'flex', alignItems: 'center',
                    fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 400,
                    letterSpacing: '0.06em',
                    color: 'var(--ink)',
                    textDecoration: 'none',
                    padding: '0 24px',
                    height: 52,
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    transition: 'color 120ms',
                  }}
                >
                  {label}
                </Link>
              ))}
            </nav>

            {/* Get API key — full-width emerald button at bottom */}
            <div style={{ padding: '16px 20px 32px' }}>
              <Link
                href="/signup"
                onClick={close}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: '#00c472', color: '#000',
                  fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700,
                  letterSpacing: '0.10em', textTransform: 'uppercase',
                  textDecoration: 'none',
                  borderRadius: 10, height: 50,
                }}
              >
                get api key
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
