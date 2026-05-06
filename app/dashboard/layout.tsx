import { createUserClient } from '@/lib/supabase-server'
import { TopNav } from './_components/top-nav'

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
      style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', color: 'var(--ink)' }}
    >
      <TopNav email={user?.email} isAdmin={isAdmin} />
      <main
        style={{
          flex: 1,
          background: 'var(--bg-0)',
          padding: '24px 28px',
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
        } as React.CSSProperties}
      >
        {children}
      </main>
    </div>
  )
}
