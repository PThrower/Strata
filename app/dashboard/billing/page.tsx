import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createUserClient, createServiceRoleClient } from '@/lib/supabase-server'
import { stripe } from '@/lib/stripe'
import UpgradeButton from '../_components/upgrade-button'
import ManageSubscriptionButton from '../_components/manage-subscription-button'

type BillingProfile = {
  tier: string
  lifetime_pro: boolean
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

const PRO_FEATURES = [
  '10,000 API calls / month',
  'News updated every 12 hours',
  'All ecosystems unlocked',
  'Daily content refreshes',
  'Priority support',
]

const FREE_FEATURES = [
  '100 API calls / month',
  'News with 24 h delay',
  '5 core ecosystems',
  'Weekly content refreshes',
]

function Check() {
  return (
    <span style={{ color: 'var(--emerald-glow)', fontSize: 13, flexShrink: 0, lineHeight: 1 }}>✓</span>
  )
}

function FeatureRow({ text }: { text: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0' }}>
      <Check />
      <span style={{ color: 'var(--foreground)', fontSize: 14 }}>{text}</span>
    </div>
  )
}

function DimRow({ text }: { text: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0' }}>
      <span style={{ color: 'var(--muted-foreground)', fontSize: 13, flexShrink: 0 }}>–</span>
      <span style={{ color: 'var(--muted-foreground)', fontSize: 14 }}>{text}</span>
    </div>
  )
}

const glowPanel = {
  background: 'linear-gradient(135deg, rgba(45,106,79,0.18) 0%, rgba(95,176,133,0.06) 100%)',
  border: '1px solid rgba(95,176,133,0.18)',
  borderRadius: 18,
  padding: '28px 32px',
  position: 'relative' as const,
  overflow: 'hidden' as const,
}

const flatPanel = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.10)',
  borderRadius: 18,
  padding: '24px 28px',
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
    .select('tier, lifetime_pro, stripe_customer_id, stripe_subscription_id')
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
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 36 }}>
        <p style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          color: 'var(--ink-faint)',
          marginBottom: 8,
        }}>
          subscription
        </p>
        <h1 style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 28,
          fontWeight: 500,
          color: 'var(--ink)',
          lineHeight: 1.1,
          margin: 0,
        }}>
          Billing
        </h1>
      </div>

      {profile.lifetime_pro ? (

        /* ── Founder Access ── */
        <div style={glowPanel}>
          <div style={{
            position: 'absolute', top: -60, right: -60,
            width: 200, height: 200, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(0,196,114,0.14) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />

          <div style={{ position: 'relative', marginBottom: 20 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600,
              letterSpacing: '0.18em', textTransform: 'uppercase' as const,
              color: '#00c472',
              background: 'rgba(0,196,114,0.08)',
              border: '1px solid rgba(0,196,114,0.28)',
              borderRadius: 999, padding: '5px 12px',
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00c472', flexShrink: 0, display: 'inline-block' }} />
              Lifetime Pro Access
            </span>
          </div>

          <p style={{
            fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 400,
            color: 'var(--foreground)', margin: '0 0 12px', position: 'relative',
          }}>
            Founder Access
          </p>

          <p style={{
            fontSize: 15, color: 'var(--muted-foreground)', lineHeight: 1.65,
            margin: '0 0 24px', maxWidth: 420, position: 'relative',
          }}>
            You&rsquo;re a founding member. Everything Strata becomes is yours, forever.
          </p>

          <div style={{
            borderTop: '1px solid rgba(0,196,114,0.18)',
            paddingTop: 16, marginBottom: 24, position: 'relative',
          }}>
            {PRO_FEATURES.map(f => <FeatureRow key={f} text={f} />)}
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' as const, position: 'relative' }}>
            <Link
              href="/docs"
              style={{
                display: 'inline-flex', alignItems: 'center',
                fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 500,
                letterSpacing: '0.06em', color: 'var(--emerald-glow)',
                border: '1px solid rgba(95,176,133,0.30)', borderRadius: 8,
                padding: '8px 18px', textDecoration: 'none',
                background: 'rgba(95,176,133,0.06)',
              }}
            >
              API docs →
            </Link>
            <Link
              href="/submit-mcp"
              style={{
                display: 'inline-flex', alignItems: 'center',
                fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 500,
                letterSpacing: '0.06em', color: 'var(--muted-foreground)',
                border: '1px solid var(--border)', borderRadius: 8,
                padding: '8px 18px', textDecoration: 'none',
              }}
            >
              Submit an MCP server →
            </Link>
          </div>
        </div>

      ) : profile.tier === 'free' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Current plan */}
          <div style={flatPanel}>
            <p style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--muted-foreground)',
              marginBottom: 12,
            }}>
              current plan
            </p>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 }}>
              <p style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 400, color: 'var(--foreground)', margin: 0 }}>
                Free
              </p>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--muted-foreground)', margin: 0 }}>
                $0 / month
              </p>
            </div>
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
              {FREE_FEATURES.map(f => <DimRow key={f} text={f} />)}
            </div>
          </div>

          {/* Upgrade to pro */}
          <div style={glowPanel}>
            {/* Background glow */}
            <div style={{
              position: 'absolute',
              top: -60,
              right: -60,
              width: 200,
              height: 200,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(95,176,133,0.14) 0%, transparent 70%)',
              pointerEvents: 'none',
            }} />

            <p style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--emerald-glow)',
              marginBottom: 14,
              position: 'relative',
            }}>
              recommended
            </p>

            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              marginBottom: 20,
              position: 'relative',
            }}>
              <p style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 400, color: 'var(--foreground)', margin: 0 }}>
                Strata Pro
              </p>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: 30, fontWeight: 600, color: 'var(--foreground)', lineHeight: 1, margin: 0 }}>$29</p>
                <p style={{ fontSize: 11, color: 'var(--muted-foreground)', marginTop: 3, fontFamily: 'var(--font-mono)' }}>/ month</p>
              </div>
            </div>

            <div style={{
              borderTop: '1px solid rgba(95,176,133,0.18)',
              paddingTop: 16,
              marginBottom: 24,
              position: 'relative',
            }}>
              {PRO_FEATURES.map(f => <FeatureRow key={f} text={f} />)}
            </div>

            <div style={{ position: 'relative' }}>
              <UpgradeButton />
            </div>
          </div>

        </div>
      ) : (

        /* Pro — active subscription */
        <div style={glowPanel}>
          <div style={{
            position: 'absolute',
            top: -60,
            right: -60,
            width: 200,
            height: 200,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(95,176,133,0.12) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />

          <p style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--emerald-glow)',
            marginBottom: 14,
            position: 'relative',
          }}>
            active subscription
          </p>

          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            marginBottom: 6,
            position: 'relative',
          }}>
            <p style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 400, color: 'var(--foreground)', margin: 0 }}>
              Strata Pro
            </p>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 30, fontWeight: 600, color: 'var(--foreground)', lineHeight: 1, margin: 0 }}>$29</p>
              <p style={{ fontSize: 11, color: 'var(--muted-foreground)', marginTop: 3, fontFamily: 'var(--font-mono)' }}>/ month</p>
            </div>
          </div>

          {nextBillingDate && (
            <p style={{ fontSize: 13, color: 'var(--muted-foreground)', marginBottom: 20, position: 'relative' }}>
              Renews{' '}
              <span style={{ color: 'var(--foreground)' }}>{nextBillingDate}</span>
            </p>
          )}

          <div style={{
            borderTop: '1px solid rgba(95,176,133,0.18)',
            paddingTop: 16,
            marginBottom: 24,
            position: 'relative',
          }}>
            {PRO_FEATURES.map(f => <FeatureRow key={f} text={f} />)}
          </div>

          <div style={{ position: 'relative' }}>
            <ManageSubscriptionButton />
          </div>
        </div>
      )}
    </div>
  )
}
