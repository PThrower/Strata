import Link from 'next/link'
import { createUserClient } from '@/lib/supabase-server'
import SidebarNav from './_components/sidebar-nav'
import MobileNav from './_components/mobile-nav'
import { SignOutButton } from './_components/SignOutButton'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createUserClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isAdmin = user?.email === process.env.ADMIN_EMAIL

  return (
    // Outer wrapper: transparent so SpaceBackdrop shows through
    <div
      className="flex flex-col min-h-screen lg:flex-row lg:h-screen lg:overflow-hidden"
      style={{ color: 'var(--ink)' }}
    >
      <MobileNav isAdmin={isAdmin} email={user?.email} />

      {/* ── Desktop sidebar — explicit background so content is readable over backdrop ── */}
      <aside
        className="hidden lg:flex w-[220px] shrink-0 flex-col px-3 py-6"
        style={{
          borderRight: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(5,6,13,0.82)',
        }}
      >
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2 px-3 mb-2 no-underline" style={{ textDecoration: 'none' }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
            background: 'var(--emerald-glow)',
            boxShadow: '0 0 10px rgba(95,176,133,0.7)',
            display: 'inline-block',
          }} />
          <span style={{
            fontFamily: 'var(--font-serif)',
            fontWeight: 400,
            fontSize: 18,
            letterSpacing: '0.1em',
            color: 'var(--emerald-glow)',
          }}>
            Strata
          </span>
        </Link>

        <SidebarNav isAdmin={isAdmin} />

        {/* Footer: email + sign out */}
        <div style={{ marginTop: 'auto', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 12 }}>
          <p style={{
            fontSize: 11, fontFamily: 'var(--font-mono)',
            color: 'var(--ink-faint)', paddingLeft: 12,
            marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {user?.email}
          </p>
          <SignOutButton />
        </div>
      </aside>

      {/* ── Main content — explicit bg so Glass cards read well over backdrop ── */}
      <main
        className="flex-1 overflow-y-auto p-4 pt-[68px] lg:p-8"
        style={{ background: 'rgba(5,6,13,0.55)' }}
      >
        {children}
      </main>
    </div>
  )
}
