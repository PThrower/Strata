// Supabase email-confirmation and OAuth callback.
//
// When a user signs up with email/password and email confirmation is enabled
// in Supabase, the confirmation email contains a link to ${appUrl}/auth/callback.
// Without this handler, the link 404s and the user can never confirm their
// email — they remain stuck behind the "Please verify your email." gate.
//
// The same path is used for OAuth callbacks (GitHub/Google/etc) when they
// are added later; exchangeCodeForSession handles both flows identically.

import { type NextRequest } from 'next/server'
import { createUserClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  const rawNext = request.nextUrl.searchParams.get('next') ?? '/dashboard'

  // Open-redirect guard: only allow same-origin paths starting with a single
  // forward slash. Reject scheme-relative ("//evil.com"), absolute URLs, and
  // anything that doesn't begin with /.
  const next =
    rawNext.startsWith('/') && !rawNext.startsWith('//')
      ? rawNext
      : '/dashboard'

  if (code) {
    const supabase = await createUserClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      const url = new URL('/login', request.url)
      url.searchParams.set('error', 'Could not complete sign-in. Please try again.')
      return Response.redirect(url, 303)
    }
  }

  return Response.redirect(new URL(next, request.url), 303)
}
