import { type NextRequest } from 'next/server'
import { createUserClient, createServiceRoleClient } from '@/lib/supabase-server'
import { stripe } from '@/lib/stripe'

type ProfileForCheckout = {
  id: string
  email: string
  stripe_customer_id: string | null
}

export async function POST(_request: NextRequest) {
  const userClient = await createUserClient()
  const { data: { user } } = await userClient.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const serviceClient = createServiceRoleClient()
  const { data: profile } = await serviceClient
    .from('profiles')
    .select('id, email, stripe_customer_id')
    .eq('id', user.id)
    .maybeSingle<ProfileForCheckout>()

  if (!profile) {
    return Response.json({ error: 'Profile not found' }, { status: 404 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: process.env.STRIPE_PRO_PRICE_ID!, quantity: 1 }],
    success_url: `${appUrl}/dashboard?upgraded=true`,
    cancel_url: `${appUrl}/dashboard`,
    client_reference_id: profile.id,
    ...(profile.stripe_customer_id
      ? { customer: profile.stripe_customer_id }
      : { customer_email: profile.email }),
  })

  return Response.json({ url: session.url })
}
