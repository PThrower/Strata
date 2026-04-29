import { type NextRequest, NextResponse } from 'next/server'
import { createUserClient } from '@/lib/supabase-server'

export async function GET(_request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!
  const supabase = await createUserClient()

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${appUrl}/auth/callback`,
    },
  })

  if (error || !data.url) {
    return NextResponse.redirect(new URL('/login?error=oauth', appUrl))
  }

  return NextResponse.redirect(data.url)
}
