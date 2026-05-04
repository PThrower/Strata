// Founder Access checkout redirect.
//
// Replaces the previous static <a href="https://buy.stripe.com/...">. The old
// link had no client_reference_id, so the Stripe webhook had no way to map
// payment to a Strata profile, and every $100 founder purchase silently failed
// to upgrade the user's tier.
//
// This route:
//   1. Requires the user to be signed in (sends them to /signup if not).
//   2. Appends client_reference_id (= profile.id) and prefilled_email so the
//      webhook can match the completed checkout to the right account.
//   3. Issues a 303 redirect to Stripe — works whether the user clicks a
//      <Link> (browser nav) or pastes /founder into the address bar.
//
// The webhook handler uses session.mode === 'payment' to detect founder
// purchases (vs subscription = recurring Pro) and sets profile.lifetime_pro.

import { type NextRequest } from 'next/server'
import { createUserClient } from '@/lib/supabase-server'

const FOUNDER_PAYMENT_LINK = 'https://buy.stripe.com/6oU4gBboLcfx20V6mlg3600'

export async function GET(request: NextRequest) {
  const supabase = await createUserClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    const url = new URL('/signup', request.url)
    url.searchParams.set('next', '/founder')
    return Response.redirect(url, 303)
  }

  const stripeUrl = new URL(FOUNDER_PAYMENT_LINK)
  stripeUrl.searchParams.set('client_reference_id', user.id)
  if (user.email) stripeUrl.searchParams.set('prefilled_email', user.email)
  return Response.redirect(stripeUrl.toString(), 303)
}
