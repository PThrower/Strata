import { redirect } from 'next/navigation'
import { createUserClient, createServiceRoleClient } from '@/lib/supabase-server'
import { stripe } from '@/lib/stripe'
import UpgradeCTA from '../_components/upgrade-cta'
import ManageSubscriptionButton from '../_components/manage-subscription-button'

type BillingProfile = {
  tier: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
}

function formatBillingDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export default async function BillingPage() {
  const userClient = await createUserClient()
  const {
    data: { user },
  } = await userClient.auth.getUser()

  if (!user) redirect('/login')

  const serviceClient = createServiceRoleClient()
  const { data: profile } = await serviceClient
    .from('profiles')
    .select('tier, stripe_customer_id, stripe_subscription_id')
    .eq('id', user.id)
    .maybeSingle<BillingProfile>()

  if (!profile) redirect('/login')

  let nextBillingDate: string | null = null
  if (profile.tier === 'pro' && profile.stripe_subscription_id) {
    try {
      const subscription = await stripe.subscriptions.retrieve(
        profile.stripe_subscription_id,
      )
      const firstItem = subscription.items.data[0]
      if (firstItem?.current_period_end) {
        nextBillingDate = formatBillingDate(firstItem.current_period_end)
      }
    } catch {
      // subscription may be cancelled or unavailable
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="font-serif text-2xl font-semibold mb-6">Billing</h1>

      {profile.tier === 'free' ? (
        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-border p-6">
          <UpgradeCTA />
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-border p-6">
          <h2 className="font-serif text-lg font-medium mb-1">Strata Pro</h2>
          <p className="text-sm text-muted-foreground mb-4">$29/month</p>
          {nextBillingDate && (
            <p className="text-sm text-muted-foreground mb-4">
              Next billing date:{' '}
              <span className="font-medium text-foreground">{nextBillingDate}</span>
            </p>
          )}
          <ManageSubscriptionButton />
        </div>
      )}
    </div>
  )
}
