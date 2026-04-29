'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { label: 'Overview',   href: '/dashboard' },
  { label: 'Analytics',  href: '/dashboard/analytics' },
  { label: 'Docs',       href: '/docs' },
  { label: 'Billing',    href: '/dashboard/billing' },
]

export default function SidebarNav() {
  const pathname = usePathname()

  return (
    <nav className="flex-1 mt-8 flex flex-col gap-1">
      {NAV_ITEMS.map(({ label, href }) => {
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
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
