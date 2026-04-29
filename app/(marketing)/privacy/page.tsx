import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Privacy Policy — Strata' }

const sections: { title: string; content: React.ReactNode }[] = [
  {
    title: '1. Information We Collect',
    content: (
      <ul style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <li>
          <strong style={{ color: 'var(--ink)', fontWeight: 500 }}>Account information:</strong>{' '}
          email address when you sign up
        </li>
        <li>
          <strong style={{ color: 'var(--ink)', fontWeight: 500 }}>Usage data:</strong> API calls
          made, endpoints used, ecosystems queried — stored in our database to enforce rate limits
          and show you your usage analytics
        </li>
        <li>
          <strong style={{ color: 'var(--ink)', fontWeight: 500 }}>Payment information:</strong>{' '}
          handled entirely by Stripe; we never store card details
        </li>
      </ul>
    ),
  },
  {
    title: '2. How We Use Your Information',
    content: (
      <ul style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <li>To provide, maintain, and improve the Service</li>
        <li>To enforce rate limits and manage your subscription</li>
        <li>To send transactional emails related to your account</li>
        <li>We do not use your data to train AI models</li>
      </ul>
    ),
  },
  {
    title: '3. Data Storage',
    content: (
      <p>
        Your data is stored in Supabase (PostgreSQL) hosted on AWS. API usage logs are retained for
        90 days. Account data is retained until you delete your account.
      </p>
    ),
  },
  {
    title: '4. Cookies',
    content: (
      <p>
        We use essential cookies only — for authentication sessions. We do not use tracking or
        advertising cookies.
      </p>
    ),
  },
  {
    title: '5. Third-Party Services',
    content: (
      <>
        <p style={{ marginBottom: 14 }}>We use the following third-party services:</p>
        <ul style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <li>Supabase (database and authentication)</li>
          <li>Stripe (payment processing)</li>
          <li>Vercel (hosting)</li>
          <li>Anthropic (AI content validation)</li>
        </ul>
        <p style={{ marginTop: 14 }}>
          Each has their own privacy policy governing their data handling.
        </p>
      </>
    ),
  },
  {
    title: '6. Your Rights',
    content: (
      <p>
        You may request deletion of your account and associated data by emailing{' '}
        <a href="mailto:support@strata.dev" className="footer-link" style={{ color: 'var(--ink-soft)' }}>
          support@strata.dev
        </a>
        . We will process requests within 30 days.
      </p>
    ),
  },
  {
    title: '7. Contact',
    content: (
      <p>
        Privacy questions:{' '}
        <a href="mailto:support@strata.dev" className="footer-link" style={{ color: 'var(--ink-soft)' }}>
          support@strata.dev
        </a>
      </p>
    ),
  },
]

export default function PrivacyPage() {
  return (
    <article style={{ maxWidth: 672, margin: '0 auto', padding: '80px 0 64px' }}>
      <h1 style={{
        fontFamily: 'var(--font-serif)', fontSize: 48, fontWeight: 500,
        letterSpacing: '-0.025em', lineHeight: 1.08,
        color: 'var(--ink)', margin: '0 0 10px',
      }}>
        Privacy Policy
      </h1>
      <p style={{
        fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.08em',
        color: 'var(--ink-faint)', margin: '0 0 64px',
      }}>
        Effective April 29, 2026
      </p>

      {sections.map(({ title, content }) => (
        <section key={title} style={{ marginBottom: 44 }}>
          <h2 style={{
            fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 400,
            letterSpacing: '-0.01em', color: 'var(--ink)', margin: '0 0 14px',
          }}>
            {title}
          </h2>
          <div style={{ color: 'var(--ink-soft)', lineHeight: 1.75, fontSize: 15 }}>
            {content}
          </div>
        </section>
      ))}
    </article>
  )
}
