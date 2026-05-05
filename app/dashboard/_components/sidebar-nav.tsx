'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const BASE_ITEMS = [
  { label: 'Overview',    href: '/dashboard' },
  { label: 'Analytics',   href: '/dashboard/analytics' },
  { label: 'Ledger',      href: '/dashboard/ledger' },
  { label: 'Agents',      href: '/dashboard/agents' },
  { label: 'Submit',      href: '/dashboard/submit' },
  { label: 'Submissions', href: '/dashboard/submissions' },
  { label: 'Submit MCP',  href: '/submit-mcp' },
  { label: 'Suggest',     href: '/dashboard/suggest' },
  { label: 'Docs',        href: '/docs' },
  { label: 'SDK Docs',    href: '/docs/sdk' },
  { label: 'Billing',     href: '/dashboard/billing' },
]

export default function SidebarNav({ isAdmin }: { isAdmin?: boolean }) {
  const pathname = usePathname()
  const items = isAdmin
    ? [...BASE_ITEMS, { label: 'Admin', href: '/dashboard/admin' }]
    : BASE_ITEMS

  return (
    <nav className="flex-1 mt-4 flex flex-col gap-0.5">
      {items.map(({ label, href }) => {
        const isActive = pathname === href
        const isDocs   = href === '/docs' || href === '/docs/sdk'
        const isSuggest = href === '/dashboard/suggest'
        return (
          <Link
            key={href}
            href={href}
            data-astro-anchor={`nav-${href.replace(/\//g, '-').replace(/^-/, '')}`}
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
  )
}
