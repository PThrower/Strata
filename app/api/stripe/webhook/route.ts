import { type NextRequest } from 'next/server'
import type Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { createServiceRoleClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  const sig = request.headers.get('stripe-signature')
  if (!sig) {
    return Response.json({ error: 'Missing signature' }, { status: 400 })
  }

  // Stripe signature verification requires the raw, unparsed body bytes.
  const rawBody = await request.text()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!,
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return Response.json(
      { error: `Webhook signature failed: ${message}` },
      { status: 400 },
    )
  }

  const supabase = createServiceRoleClient()

  // Idempotency: insert the event id first. A unique-violation means we have
  // already processed this event — return 200 so Stripe stops retrying.
  const { error: dedupErr } = await supabase
    .from('stripe_events')
    .insert({ event_id: event.id, event_type: event.type })

  if (dedupErr) {
    if (dedupErr.code === '23505') {
      return Response.json({ received: true, duplicate: true })
    }
    console.error('[stripe webhook] dedup insert failed:', dedupErr.message)
    return Response.json({ error: 'Service error' }, { status: 503 })
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object
      const profileId = session.client_reference_id
      const customerId =
        typeof session.customer === 'string'
          ? session.customer
          : session.customer?.id ?? null
      const subscriptionId =
        typeof session.subscription === 'string'
          ? session.subscription
          : session.subscription?.id ?? null

      if (profileId) {
        const { error } = await supabase
          .from('profiles')
          .update({
            tier: 'pro',
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
          })
          .eq('id', profileId)
        if (error) {
          console.error('[stripe webhook] checkout upgrade failed:', error.message)
          return Response.json({ error: 'Service error' }, { status: 503 })
        }
      }
      break
    }
    case 'customer.subscription.deleted': {
      const subscription = event.data.object
      const customerId =
        typeof subscription.customer === 'string'
          ? subscription.customer
          : subscription.customer.id

      // Match on subscription_id too: a stale delete event for an old
      // subscription must not downgrade a re-subscribed customer.
      const { error } = await supabase
        .from('profiles')
        .update({ tier: 'free', stripe_subscription_id: null })
        .eq('stripe_customer_id', customerId)
        .eq('stripe_subscription_id', subscription.id)
      if (error) {
        console.error('[stripe webhook] subscription delete failed:', error.message)
        return Response.json({ error: 'Service error' }, { status: 503 })
      }
      break
    }
  }

  return Response.json({ received: true })
}
