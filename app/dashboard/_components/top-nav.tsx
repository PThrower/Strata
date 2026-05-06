'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signoutAction } from '@/app/actions/auth'

const NAV_GROUPS = [
  {
    label: 'Security',
    items: [
      { label: 'Threats',   href: '/dashboard/threats' },
      { label: 'Breakers',  href: '/dashboard/circuit-breakers' },
      { label: 'Anomalies', href: '/dashboard/anomalies' },
      { label: 'Policies',  href: '/dashboard/policies' },
    ],
  },
  {
    label: 'Identity',
    items: [
      { label: 'Agents', href: '/dashboard/agents' },
      { label: 'Ledger', href: '/dashboard/ledger' },
    ],
  },
  {
    label: 'Data',
    items: [
      { label: 'Lineage', href: '/dashboard/lineage' },
      { label: 'Graph',   href: '/dashboard/dependency-graph' },
    ],
  },
  {
    label: 'Account',
    items: [
      { label: 'Analytics',   href: '/dashboard/analytics' },
      { label: 'Submissions', href: '/dashboard/submissions' },
      { label: 'Billing',     href: '/dashboard/billing' },
      { label: 'Docs',        href: '/docs' },
    ],
  },
]

interface TopNavProps {
  email?: string
  isAdmin?: boolean
}

export function TopNav({ email, isAdmin }: TopNavProps) {
  const pathname  = usePathname()
  const [open, setOpen] = useState(false)

  const allGroups = isAdmin
    ? [...NAV_GROUPS, { label: 'Admin', items: [{ label: 'Admin', href: '/dashboard/admin' }] }]
    : NAV_GROUPS

  return (
    <>
      {/* ── Sticky top bar ── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 40,
        height: 52, display: 'flex', alignItems: 'center',
        padding: '0 20px', gap: 0, flexShrink: 0,
        background: 'rgba(5,6,13,0.92)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}>
        {/* Brand */}
        <Link
          href="/dashboard"
          style={{ display: 'flex', alignItems: 'center', gap: 7, textDecoration: 'none', flexShrink: 0 }}
        >
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: '#00c472', display: 'inline-block', flexShrink: 0,
            boxShadow: '0 0 10px rgba(0,196,114,0.55)',
          }} />
          <span style={{
            fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 17,
            letterSpacing: '0.10em', color: '#00c472',
          }}>
            Strata
          </span>
        </Link>

        {/* Desktop grouped nav */}
        <nav
          className="hidden lg:flex"
          style={{
            flex: 1, alignItems: 'center', padding: '0 20px',
            overflowX: 'auto', scrollbarWidth: 'none' as const,
          }}
          aria-label="Dashboard navigation"
        >
          <style>{`.dn-nav::-webkit-scrollbar{display:none}`}</style>
          {allGroups.map((group, gi) => (
            <span key={group.label} style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
              {gi > 0 && (
                <span aria-hidden="true" style={{
                  fontFamily: 'var(--font-mono)', fontSize: 12,
                  color: 'rgba(255,255,255,0.15)', padding: '0 8px',
                }}>
                  ·
                </span>
              )}
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 500,
                letterSpacing: '0.18em', textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.28)', marginRight: 8, flexShrink: 0,
              }}>
                {group.label}
              </span>
              {group.items.map(item => {
                const active = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    style={{
                      fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 400,
                      color: active ? '#00c472' : 'rgba(255,255,255,0.55)',
                      textDecoration: 'none', flexShrink: 0,
                      borderBottom: `2px solid ${active ? '#00c472' : 'transparent'}`,
                      paddingBottom: 1,
                      marginRight: 14,
                      lineHeight: '50px',
                      display: 'inline-block',
                    }}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </span>
          ))}
        </nav>

        {/* Desktop: email + sign out */}
        <div className="hidden lg:flex" style={{ alignItems: 'center', gap: 10, flexShrink: 0 }}>
          {email && (
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 11,
              color: 'rgba(255,255,255,0.30)',
              maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {email}
            </span>
          )}
          <form action={signoutAction}>
            <button
              type="submit"
              title="Sign out"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: 'var(--font-mono)', fontSize: 13,
                color: 'rgba(255,255,255,0.30)', padding: '2px 4px',
                transition: 'color 120ms',
              }}
              onMouseOver={e => (e.currentTarget.style.color = '#fff')}
              onMouseOut={e  => (e.currentTarget.style.color = 'rgba(255,255,255,0.30)')}
            >
              →
            </button>
          </form>
        </div>

        {/* Mobile hamburger */}
        <button
          className="lg:hidden"
          onClick={() => setOpen(true)}
          aria-label="Open navigation"
          style={{
            marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer',
            color: 'rgba(255,255,255,0.55)', fontSize: 18, padding: 8,
          }}
        >
          ☰
        </button>
      </header>

      {/* ── Mobile overlay drawer ── */}
      {open && (
        <div className="lg:hidden" style={{ position: 'fixed', inset: 0, zIndex: 50 }}>
          {/* Backdrop */}
          <div
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.78)' }}
            onClick={() => setOpen(false)}
          />
          {/* Drawer */}
          <aside style={{
            position: 'absolute', top: 0, left: 0, height: '100%',
            width: 260, overflowY: 'auto',
            background: 'rgba(5,6,13,0.97)',
            borderRight: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(20px)',
            display: 'flex', flexDirection: 'column',
            padding: '20px 16px',
          }}>
            {/* Drawer header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <Link
                href="/dashboard"
                onClick={() => setOpen(false)}
                style={{ display: 'flex', alignItems: 'center', gap: 7, textDecoration: 'none' }}
              >
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#00c472', display: 'inline-block' }} />
                <span style={{ fontFamily: 'var(--font-serif)', fontSize: 18, letterSpacing: '0.10em', color: '#00c472' }}>Strata</span>
              </Link>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close navigation"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.45)', fontSize: 18 }}
              >
                ✕
              </button>
            </div>

            {/* Grouped nav */}
            <nav style={{ flex: 1 }}>
              {allGroups.map(group => (
                <div key={group.label} style={{ marginBottom: 18 }}>
                  <p style={{
                    fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 500,
                    letterSpacing: '0.18em', textTransform: 'uppercase',
                    color: 'rgba(255,255,255,0.28)', marginBottom: 4, paddingLeft: 4,
                  }}>
                    {group.label}
                  </p>
                  {group.items.map(item => {
                    const active = pathname === item.href
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setOpen(false)}
                        style={{
                          display: 'block', textDecoration: 'none',
                          fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 400,
                          color: active ? '#00c472' : 'rgba(255,255,255,0.60)',
                          padding: '9px 0 9px 12px',
                          borderLeft: `2px solid ${active ? '#00c472' : 'transparent'}`,
                        }}
                      >
                        {item.label}
                      </Link>
                    )
                  })}
                </div>
              ))}
            </nav>

            {/* Footer */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 12 }}>
              {email && (
                <p style={{
                  fontSize: 11, fontFamily: 'var(--font-mono)',
                  color: 'rgba(255,255,255,0.28)', paddingLeft: 4, marginBottom: 8,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
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
                    color: 'rgba(255,255,255,0.35)', paddingLeft: 4,
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
