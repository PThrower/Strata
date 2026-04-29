'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { label: 'Overview', href: '/dashboard' },
  { label: 'Docs', href: '/docs' },
  { label: 'Billing', href: '/dashboard/billing' },
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
                ? 'bg-gray-100 text-gray-900 font-medium'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
