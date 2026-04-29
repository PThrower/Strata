import { Playfair_Display } from 'next/font/google'
import { createUserClient } from '@/lib/supabase-server'
import SidebarNav from './_components/sidebar-nav'
import { signoutAction } from '@/app/actions/auth'

const playfairDisplay = Playfair_Display({
  variable: '--font-playfair-display',
  subsets: ['latin'],
})

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
    <div className={`${playfairDisplay.variable} flex h-screen overflow-hidden`}>
      <aside className="w-[220px] shrink-0 flex flex-col border-r bg-white px-4 py-6">
        <div className="flex items-center gap-2 px-3">
          <span className="text-[#1D9E75] text-lg leading-none">●</span>
          <span className="font-serif font-semibold text-lg">Strata</span>
        </div>

        <SidebarNav />

        <div className="mt-auto pt-4 border-t">
          <p className="text-xs text-gray-400 truncate px-3 mb-2">
            {user?.email}
          </p>
          <form action={signoutAction}>
            <button
              type="submit"
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors px-3 py-1"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-8 bg-gray-50">{children}</main>
    </div>
  )
}
