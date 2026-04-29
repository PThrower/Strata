import { type NextRequest } from 'next/server'
import { createUserClient, createServiceRoleClient } from '@/lib/supabase-server'
import { stripe } from '@/lib/stripe'

type ProfileForPortal = {
  stripe_customer_id: string | null
}

export async function POST(_request: NextRequest) {
  const userClient = await createUserClient()
  const {
    data: { user },
  } = await userClient.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const serviceClient = createServiceRoleClient()
  const { data: profile } = await serviceClient
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .maybeSingle<ProfileForPortal>()

  if (!profile?.stripe_customer_id) {
    return Response.json({ error: 'No subscription found' }, { status: 400 })
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing`,
  })

  return Response.json({ url: session.url })
}
