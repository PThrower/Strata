'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

const NAV_LINKS = [
  { label: 'docs',         href: '/docs' },
  { label: 'sdk',          href: '/docs/sdk' },
  { label: 'how it works', href: '/how-it-works' },
  { label: 'submit mcp',   href: '/submit-mcp' },
  { label: 'pricing',      href: '/#pricing' },
]

export function MarketingMobileNav() {
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)

  // Close on outside click/tap (both mouse and touch)
  useEffect(() => {
    if (!open) return
    function handleOutside(e: MouseEvent | TouchEvent) {
      const target = e instanceof TouchEvent ? e.touches[0]?.target : e.target
      if (
        target instanceof Node &&
        !btnRef.current?.contains(target) &&
        !dropRef.current?.contains(target)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    document.addEventListener('touchstart', handleOutside)
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      document.removeEventListener('touchstart', handleOutside)
    }
  }, [open])

  function close() { setOpen(false) }

  return (
    <>
      {/* Hamburger button — visible only below sm breakpoint */}
      <button
        ref={btnRef}
        onClick={() => setOpen(v => !v)}
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        className="sm:hidden"
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          padding: '8px 6px', display: 'flex', flexDirection: 'column',
          gap: 5, alignItems: 'center', justifyContent: 'center',
        }}
      >
        {open ? (
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <line x1="1" y1="1" x2="17" y2="17" stroke="var(--emerald-glow)" strokeWidth="2.2" strokeLinecap="round" />
            <line x1="17" y1="1" x2="1" y2="17" stroke="var(--emerald-glow)" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        ) : (
          <>
            <span style={{ width: 20, height: 2, borderRadius: 2, background: 'var(--ink-muted)', display: 'block' }} />
            <span style={{ width: 20, height: 2, borderRadius: 2, background: 'var(--ink-muted)', display: 'block' }} />
            <span style={{ width: 13, height: 2, borderRadius: 2, background: 'var(--ink-muted)', display: 'block', alignSelf: 'flex-start' }} />
          </>
        )}
      </button>

      {/* Dropdown — position:fixed so it escapes any parent stacking context */}
      {open && (
        <div
          ref={dropRef}
          className="sm:hidden"
          style={{
            position: 'fixed',
            top: 82,   /* 16px (sticky offset) + 64px (nav height) + 2px gap */
            right: 16,
            width: 220,
            background: 'rgba(5,6,13,0.97)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 16,
            padding: '8px 0 12px',
            zIndex: 9999,
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
                fontSize: 12,
                fontWeight: 500,
                letterSpacing: '0.10em',
                textTransform: 'uppercase',
                color: 'var(--ink-muted)',
                textDecoration: 'none',
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
    </>
  )
}
