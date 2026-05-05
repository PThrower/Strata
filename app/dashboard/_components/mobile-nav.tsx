'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signoutAction } from '@/app/actions/auth'

const NAV_ITEMS = [
  { label: 'Overview',    href: '/dashboard' },
  { label: 'Analytics',   href: '/dashboard/analytics' },
  { label: 'Ledger',      href: '/dashboard/ledger' },
  { label: 'Submit',      href: '/dashboard/submit' },
  { label: 'Submissions', href: '/dashboard/submissions' },
  { label: 'Submit MCP',  href: '/submit-mcp' },
  { label: 'Suggest',     href: '/dashboard/suggest' },
  { label: 'Docs',        href: '/docs' },
  { label: 'SDK Docs',    href: '/docs/sdk' },
  { label: 'Billing',     href: '/dashboard/billing' },
]

export default function MobileNav({ isAdmin, email }: { isAdmin?: boolean; email?: string }) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const items = isAdmin ? [...NAV_ITEMS, { label: 'Admin', href: '/dashboard/admin' }] : NAV_ITEMS

  return (
    <>
      {/* Fixed top bar */}
      <div
        className="lg:hidden fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-4"
        style={{
          height: 52,
          background: 'rgba(5,6,13,0.9)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <Link href="/" className="flex items-center gap-2" style={{ textDecoration: 'none' }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
            background: 'var(--emerald-glow)',
            boxShadow: '0 0 10px rgba(95,176,133,0.7)',
            display: 'inline-block',
          }} />
          <span style={{
            fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 17,
            letterSpacing: '0.1em', color: 'var(--emerald-glow)',
          }}>Strata</span>
        </Link>
        <button
          onClick={() => setOpen(true)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8, color: 'var(--ink-muted)', fontSize: 18 }}
          aria-label="Open menu"
        >☰</button>
      </div>

      {open && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div
            className="absolute inset-0"
            style={{ background: 'rgba(0,0,0,0.6)' }}
            onClick={() => setOpen(false)}
          />
          <aside
            className="absolute top-0 left-0 h-full flex flex-col overflow-y-auto"
            style={{
              width: 240,
              background: 'rgba(5,6,13,0.97)',
              borderRight: '1px solid rgba(255,255,255,0.08)',
              backdropFilter: 'blur(20px)',
              padding: '24px 12px',
            }}
          >
            <div className="flex items-center justify-between mb-5 px-1">
              <Link href="/" className="flex items-center gap-2" style={{ textDecoration: 'none' }}>
                <span style={{
                  width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                  background: 'var(--emerald-glow)',
                  boxShadow: '0 0 10px rgba(95,176,133,0.7)',
                  display: 'inline-block',
                }} />
                <span style={{
                  fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 18,
                  letterSpacing: '0.1em', color: 'var(--emerald-glow)',
                }}>Strata</span>
              </Link>
              <button
                onClick={() => setOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-muted)', fontSize: 18 }}
                aria-label="Close menu"
              >✕</button>
            </div>

            <nav className="flex-1 flex flex-col gap-0.5">
              {items.map(({ label, href }) => {
                const isActive  = pathname === href
                const isDocs    = href === '/docs' || href === '/docs/sdk'
                const isSuggest = href === '/dashboard/suggest'
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setOpen(false)}
                    className={`dash-nav-link${isActive ? ' active' : ''}`}
                  >
                    {isDocs ? (
                      <span className="brand-gradient-text">{label}</span>
                    ) : isSuggest && !isActive ? (
                      <span style={{ color: '#9be0bd' }}>{label}</span>
                    ) : label}
                  </Link>
                )
              })}
            </nav>

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 12, marginTop: 8 }}>
              {email && (
                <p style={{
                  fontSize: 11, fontFamily: 'var(--font-mono)',
                  color: 'var(--ink-faint)', paddingLeft: 12,
                  marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {email}
                </p>
              )}
              <form action={signoutAction}>
                <button
                  type="submit"
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 12, fontFamily: 'var(--font-mono)',
                    color: 'var(--ink-faint)', paddingLeft: 12,
                  }}
                >
                  Sign out
                </button>
              </form>
            </div>
          </aside>
        </div>
      )}
    </>
  )
}
