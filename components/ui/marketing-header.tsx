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
  const dropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handle(e: MouseEvent | TouchEvent) {
      const target = (e instanceof TouchEvent ? e.touches[0]?.target : e.target) as Node | null
      if (target && !btnRef.current?.contains(target) && !dropRef.current?.contains(target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handle)
    document.addEventListener('touchstart', handle)
    return () => {
      document.removeEventListener('mousedown', handle)
      document.removeEventListener('touchstart', handle)
    }
  }, [open])

  function close() { setOpen(false) }

  return (
    // Wrapper is the sticky container — dropdown is a sibling of the glass nav,
    // never inside it, so backdrop-filter cannot trap position:fixed descendants.
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
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '10px 8px', flexDirection: 'column',
              gap: 5, alignItems: 'center',
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
                <span style={{ width: 14, height: 2, borderRadius: 2, background: 'var(--ink-muted)', display: 'block', alignSelf: 'flex-start' }} />
              </>
            )}
          </button>
        </div>
      </nav>

      {/* Dropdown — SIBLING of the glass nav, not inside it.
          Positioned absolute relative to this sticky container so it sits
          just below the nav without being trapped by backdrop-filter. */}
      {open && (
        <div
          ref={dropRef}
          className="sm:hidden max-w-[1200px] mx-auto"
          style={{
            position: 'absolute',
            top: 72,          // 8px below bottom of 64px nav
            right: 16,
            width: 220,
            background: 'rgba(5,6,13,0.97)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 16,
            padding: '8px 0 12px',
            zIndex: 100,
          }}
        >
          {NAV_LINKS.map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              onClick={close}
              style={{
                display: 'block',
                fontFamily: 'var(--font-mono)',
                fontSize: 12, fontWeight: 500,
                letterSpacing: '0.10em', textTransform: 'uppercase',
                color: 'var(--ink-muted)', textDecoration: 'none',
                padding: '11px 20px',
              }}
            >
              {label}
            </Link>
          ))}
          <div style={{ margin: '8px 12px 0', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 10 }}>
            <Link
              href="/signup"
              onClick={close}
              style={{
                display: 'block', textAlign: 'center',
                fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600,
                letterSpacing: '0.10em', textTransform: 'uppercase',
                color: '#fff', textDecoration: 'none',
                background: 'var(--emerald)', borderRadius: 10,
                padding: '10px 0',
              }}
            >
              get api key
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
