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
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  // Close on route change (link click)
  function handleLinkClick() { setOpen(false) }

  return (
    <div ref={menuRef} className="sm:hidden" style={{ position: 'relative' }}>
      {/* Hamburger button */}
      <button
        onClick={() => setOpen(v => !v)}
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          padding: '8px 10px', display: 'flex', flexDirection: 'column',
          gap: 5, justifyContent: 'center', alignItems: 'center',
        }}
      >
        {open ? (
          // × close icon
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <line x1="1" y1="1" x2="17" y2="17" stroke="var(--emerald-glow)" strokeWidth="2" strokeLinecap="round" />
            <line x1="17" y1="1" x2="1" y2="17" stroke="var(--emerald-glow)" strokeWidth="2" strokeLinecap="round" />
          </svg>
        ) : (
          // ☰ hamburger
          <>
            <span style={{ width: 20, height: 2, borderRadius: 2, background: 'var(--ink-muted)', display: 'block' }} />
            <span style={{ width: 20, height: 2, borderRadius: 2, background: 'var(--ink-muted)', display: 'block' }} />
            <span style={{ width: 14, height: 2, borderRadius: 2, background: 'var(--ink-muted)', display: 'block', alignSelf: 'flex-start' }} />
          </>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          style={{
            position: 'absolute', top: 'calc(100% + 10px)', right: 0,
            width: 220,
            background: 'rgba(5,6,13,0.97)',
            backdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,0.10)',
            borderRadius: 16,
            padding: '10px 0 14px',
            zIndex: 100,
          }}
        >
          <nav aria-label="Mobile navigation">
            {NAV_LINKS.map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                onClick={handleLinkClick}
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
                  transition: 'color 0.12s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--emerald-glow)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--ink-muted)' }}
              >
                {label}
              </Link>
            ))}

            <div style={{ margin: '10px 14px 0', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 12 }}>
              <Link
                href="/signup"
                onClick={handleLinkClick}
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
          </nav>
        </div>
      )}
    </div>
  )
}
