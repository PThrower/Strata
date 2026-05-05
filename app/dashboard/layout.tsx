import Link from 'next/link'
import { createUserClient, createServiceRoleClient } from '@/lib/supabase-server'
import { FREE_LIMIT, PRO_LIMIT } from '@/lib/api-auth'
import SidebarNav from './_components/sidebar-nav'
import MobileNav from './_components/mobile-nav'
import { AstronautPet } from '@/components/ui/AstronautPet'
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

  const isAdmin = user?.email === process.env.ADMIN_EMAIL

  // Fetch usage data for AstronautPet mood + founder badge
  let usagePercent = 0
  let founderBadge = false
  if (user) {
    const svc = createServiceRoleClient()
    const { data: profile } = await svc
      .from('profiles')
      .select('calls_used, tier, lifetime_pro')
      .eq('id', user.id)
      .maybeSingle()
    if (profile) {
      const limit = profile.tier === 'pro' ? PRO_LIMIT : FREE_LIMIT
      usagePercent = Math.min((profile.calls_used / limit) * 100, 100)
      founderBadge = profile.lifetime_pro ?? false
    }
  }

  return (
    <div
      className="flex flex-col min-h-screen lg:flex-row lg:h-screen lg:overflow-hidden"
      style={{ background: 'var(--bg-0)', color: 'var(--ink)' }}
    >
      <MobileNav isAdmin={isAdmin} email={user?.email} />

      {/* ── Desktop sidebar ── */}
      <aside
        className="hidden lg:flex w-[220px] shrink-0 flex-col px-3 py-6"
        style={{
          borderRight: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(5,6,13,0.7)',
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

        {/* Astronaut companion */}
        <div style={{ paddingTop: 16, paddingBottom: 8 }}>
          <AstronautPet
            usagePercent={usagePercent}
            founderBadge={founderBadge}
          />
        </div>

        {/* Footer: email + sign out */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 12 }}>
          <p style={{
            fontSize: 11, fontFamily: 'var(--font-mono)',
            color: 'var(--ink-faint)', paddingLeft: 12,
            marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {user?.email}
          </p>
          <form action={signoutAction}>
            <button
              type="submit"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 12, fontFamily: 'var(--font-mono)',
                color: 'var(--ink-faint)', paddingLeft: 12, paddingTop: 2,
                transition: 'color 150ms',
              }}
              onMouseOver={e => (e.currentTarget.style.color = 'var(--ink-soft)')}
              onMouseOut={e  => (e.currentTarget.style.color = 'var(--ink-faint)')}
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main
        className="flex-1 overflow-y-auto p-4 pt-[68px] lg:p-8"
        style={{ background: 'transparent' }}
      >
        {children}
      </main>
    </div>
  )
}
