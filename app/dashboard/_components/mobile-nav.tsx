'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signoutAction } from '@/app/actions/auth'

const NAV_ITEMS = [
  { label: 'Overview',    href: '/dashboard' },
  { label: 'Analytics',   href: '/dashboard/analytics' },
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
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-4 h-[52px] bg-white dark:bg-zinc-900 border-b border-border">
        <Link href="/" className="flex items-center gap-2" style={{ textDecoration: 'none' }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, #c084fc, #818cf8, #5fb085)',
            boxShadow: '0 0 8px rgba(192,132,252,0.6)',
            display: 'inline-block',
          }} />
          <span className="brand-gradient-text" style={{
            fontFamily: 'var(--font-serif)',
            fontWeight: 600,
            fontSize: 17,
            letterSpacing: '0.01em',
          }}>Strata</span>
        </Link>
        <button
          onClick={() => setOpen(true)}
          className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-md"
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}
          aria-label="Open menu"
        >☰</button>
      </div>

      {open && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="absolute top-0 left-0 h-full flex flex-col w-[240px] bg-white dark:bg-zinc-900 border-r border-border px-4 py-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <Link href="/" className="flex items-center gap-2" style={{ textDecoration: 'none' }}>
                <span style={{
                  width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                  background: 'linear-gradient(135deg, #c084fc, #818cf8, #5fb085)',
                  boxShadow: '0 0 8px rgba(192,132,252,0.6)',
                  display: 'inline-block',
                }} />
                <span className="brand-gradient-text" style={{
                  fontFamily: 'var(--font-serif)',
                  fontWeight: 600,
                  fontSize: 18,
                  letterSpacing: '0.01em',
                }}>Strata</span>
              </Link>
              <button
                onClick={() => setOpen(false)}
                className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}
                aria-label="Close menu"
              >✕</button>
            </div>

            <nav className="flex-1 flex flex-col gap-1">
              {items.map(({ label, href }) => {
                const isActive = pathname === href
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setOpen(false)}
                    className={`px-3 py-2 rounded-md text-sm transition-colors ${
                      isActive
                        ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 font-medium'
                        : 'text-muted-foreground hover:text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    {href === '/docs' || href === '/docs/sdk' ? (
                      <span className="brand-gradient-text">{label}</span>
                    ) : href === '/dashboard/suggest' && !isActive ? (
                      <span style={{ color: '#9be0bd' }}>{label}</span>
                    ) : label}
                  </Link>
                )
              })}
            </nav>

            <div className="mt-auto pt-4 border-t border-border">
              {email && (
                <p className="text-xs text-muted-foreground truncate px-3 mb-2">{email}</p>
              )}
              <form action={signoutAction}>
                <button type="submit" className="text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1">
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
