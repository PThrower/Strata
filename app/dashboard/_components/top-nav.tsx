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
        height: 64, display: 'flex', alignItems: 'center',
        padding: '0 20px', gap: 0, flexShrink: 0,
        background: 'rgba(5,6,13,0.80)',
        borderBottom: '1px solid rgba(255,255,255,0.09)',
        backdropFilter: 'blur(20px) saturate(1.6)',
        WebkitBackdropFilter: 'blur(20px) saturate(1.6)',
        boxShadow: 'inset 0 -1px 0 rgba(255,255,255,0.04)',
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
          {allGroups.map((group, gi) => (
            <span key={group.label} style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
              {gi > 0 && (
                <span aria-hidden="true" style={{
                  fontFamily: 'var(--font-mono)', fontSize: 12,
                  color: 'var(--hair)', padding: '0 8px',
                }}>
                  ·
                </span>
              )}
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500,
                letterSpacing: '0.18em', textTransform: 'uppercase',
                color: 'var(--ink-faint)', marginRight: 8, flexShrink: 0,
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
                      fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 400,
                      color: active ? '#00c472' : 'var(--ink-muted)',
                      textDecoration: 'none', flexShrink: 0,
                      borderBottom: `2px solid ${active ? '#00c472' : 'transparent'}`,
                      paddingBottom: 1,
                      marginRight: 16,
                      lineHeight: '62px',
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
              color: 'var(--ink-faint)',
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
                color: 'var(--ink-faint)', padding: '2px 4px',
                transition: 'color 120ms',
              }}
              onMouseOver={e => (e.currentTarget.style.color = 'var(--ink)')}
              onMouseOut={e  => (e.currentTarget.style.color = 'var(--ink-faint)')}
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
            color: 'var(--ink-muted)', fontSize: 18, padding: 8,
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
            background: 'var(--bg-0)',
            borderRight: '1px solid var(--hair)',
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
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-faint)', fontSize: 18 }}
              >
                ✕
              </button>
            </div>

            {/* Grouped nav */}
            <nav style={{ flex: 1 }}>
              {allGroups.map(group => (
                <div key={group.label} style={{ marginBottom: 18 }}>
                  <p style={{
                    fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500,
                    letterSpacing: '0.18em', textTransform: 'uppercase',
                    color: 'var(--ink-faint)', marginBottom: 4, paddingLeft: 4,
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
                          color: active ? '#00c472' : 'var(--ink-muted)',
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
            <div style={{ borderTop: '1px solid var(--hair)', paddingTop: 12 }}>
              {email && (
                <p style={{
                  fontSize: 11, fontFamily: 'var(--font-mono)',
                  color: 'var(--ink-faint)', paddingLeft: 4, marginBottom: 8,
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
                    color: 'var(--ink-faint)', paddingLeft: 4,
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
