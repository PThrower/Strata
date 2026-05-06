import { createUserClient } from '@/lib/supabase-server'
import { TopNav } from './_components/top-nav'
import { SpaceBackdrop } from '@/components/ui/space-backdrop'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createUserClient()
  const { data: { user } } = await supabase.auth.getUser()
  const isAdmin = user?.email === process.env.ADMIN_EMAIL

  return (
    <div
      style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', color: 'var(--ink)', position: 'relative' }}
    >
      {/* Fixed space backdrop — sits at z-index -3 to 0, behind all content */}
      <SpaceBackdrop />

      <TopNav email={user?.email} isAdmin={isAdmin} />
      <main
        style={{
          flex: 1,
          /* Semi-transparent so the space backdrop shows through glass cards */
          background: 'rgba(5,6,13,0.72)',
          padding: '24px 28px',
          position: 'relative',
          zIndex: 1,
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
        } as React.CSSProperties}
      >
        {children}
      </main>
    </div>
  )
}
