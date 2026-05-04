'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const BASE_ITEMS = [
  { label: 'Overview',    href: '/dashboard' },
  { label: 'Analytics',   href: '/dashboard/analytics' },
  { label: 'Submit',      href: '/dashboard/submit' },
  { label: 'Submissions', href: '/dashboard/submissions' },
  { label: 'Submit MCP',  href: '/submit-mcp' },
  { label: 'Suggest',    href: '/dashboard/suggest' },
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
    <nav className="flex-1 mt-8 flex flex-col gap-1">
      {items.map(({ label, href }) => {
        const isActive = pathname === href
        return (
          <Link
            key={href}
            href={href}
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
  )
}
