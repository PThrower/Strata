import { type NextRequest } from 'next/server'
import type Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { createServiceRoleClient } from '@/lib/supabase-server'

type SupabaseClient = ReturnType<typeof createServiceRoleClient>

// Extracted handler so it can throw — lets the POST function roll back the
// dedup row and return 503 if processing fails, allowing Stripe to retry.
async function processEvent(event: Stripe.Event, supabase: SupabaseClient): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object
      const profileId = session.client_reference_id
      if (!profileId) break

      // Founder Access uses a one-time Payment Link (mode='payment'), regular
      // Pro uses a recurring subscription (mode='subscription'). Differentiate
      // here so founders get lifetime_pro=true and never get downgraded by
      // customer.subscription.deleted later.
      const isLifetimeFounder = session.mode === 'payment'

      if (isLifetimeFounder) {
        // Customer object is still useful for portal access; keep it.
        const customerId =
          typeof session.customer === 'string'
            ? session.customer
            : session.customer?.id ?? null
        const { error } = await supabase
          .from('profiles')
          .update({
            tier: 'pro',
            lifetime_pro: true,
            stripe_customer_id: customerId,
          })
          .eq('id', profileId)
        if (error) throw new Error(`founder upgrade failed: ${error.message}`)
      } else {
        const customerId =
          typeof session.customer === 'string'
            ? session.customer
            : session.customer?.id ?? null
        const subscriptionId =
          typeof session.subscription === 'string'
            ? session.subscription
            : session.subscription?.id ?? null

        const { error } = await supabase
          .from('profiles')
          .update({
            tier: 'pro',
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
          })
          .eq('id', profileId)
        if (error) throw new Error(`checkout upgrade failed: ${error.message}`)
      }
      break
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object
      const customerId =
        typeof subscription.customer === 'string'
          ? subscription.customer
          : subscription.customer.id

      // Three predicates ensure we only downgrade the right account:
      //   - matching customer_id     (right user)
      //   - matching subscription_id (right subscription — stale events
      //                               for an old, replaced subscription
      //                               must not affect the new one)
      //   - lifetime_pro is false    (founders keep Pro forever even if
      //                               they later subscribe-and-cancel)
      const { error } = await supabase
        .from('profiles')
        .update({ tier: 'free', stripe_subscription_id: null })
        .eq('stripe_customer_id', customerId)
        .eq('stripe_subscription_id', subscription.id)
        .eq('lifetime_pro', false)
      if (error) throw new Error(`subscription delete failed: ${error.message}`)
      break
    }
  }
}

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

  // Atomic dedup: INSERT to claim the event before processing.
  // A 23505 unique-violation means this event was already processed.
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

  // M-2: if the handler fails, remove the dedup row so Stripe can retry.
  // Previously the event was permanently lost because the dedup row remained
  // after a 503 response, causing Stripe's retry to receive 200 "duplicate".
  try {
    await processEvent(event, supabase)
  } catch (err) {
    console.error('[stripe webhook] handler failed:', err)
    await supabase.from('stripe_events').delete().eq('event_id', event.id)
    return Response.json({ error: 'Service error' }, { status: 503 })
  }

  return Response.json({ received: true })
}
