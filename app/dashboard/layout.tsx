import Link from 'next/link'
import { createUserClient } from '@/lib/supabase-server'
import SidebarNav from './_components/sidebar-nav'
import { signoutAction } from '@/app/actions/auth'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createUserClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-[220px] shrink-0 flex flex-col border-r border-border bg-white dark:bg-zinc-900 px-4 py-6">
        <Link href="/" className="flex items-center gap-2 px-3 no-underline group" style={{ textDecoration: 'none' }}>
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
          }}>
            Strata
          </span>
        </Link>

        <SidebarNav isAdmin={user?.email === process.env.ADMIN_EMAIL} />

        <div className="mt-auto pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground truncate px-3 mb-2">
            {user?.email}
          </p>
          <form action={signoutAction}>
            <button
              type="submit"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-8 bg-gray-50 dark:bg-zinc-950">
        {children}
      </main>
    </div>
  )
}
