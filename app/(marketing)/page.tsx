import Link from 'next/link'

/* ─── Data ─── */
const ecosystems = [
  {
    name: 'Claude',
    mark: (
      <svg className="eco-mark" viewBox="0 0 60 60" fill="none" stroke="rgba(255,255,255,0.92)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M30 8 L52 50 L8 50 Z" />
        <line x1="17" y1="38" x2="43" y2="38" />
        <circle cx="30" cy="22" r="1.6" fill="rgba(255,255,255,0.92)" stroke="none" />
      </svg>
    ),
  },
  {
    name: 'ChatGPT',
    mark: (
      <svg className="eco-mark" viewBox="0 0 60 60" fill="none" stroke="rgba(255,255,255,0.92)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <g transform="translate(30 30)">
          <ellipse cx="0" cy="-13" rx="6.5" ry="13" />
          <ellipse cx="0" cy="-13" rx="6.5" ry="13" transform="rotate(60)" />
          <ellipse cx="0" cy="-13" rx="6.5" ry="13" transform="rotate(120)" />
          <ellipse cx="0" cy="-13" rx="6.5" ry="13" transform="rotate(180)" />
          <ellipse cx="0" cy="-13" rx="6.5" ry="13" transform="rotate(240)" />
          <ellipse cx="0" cy="-13" rx="6.5" ry="13" transform="rotate(300)" />
          <circle cx="0" cy="0" r="2" fill="rgba(255,255,255,0.92)" stroke="none" />
        </g>
      </svg>
    ),
  },
  {
    name: 'Gemini',
    mark: (
      <svg className="eco-mark" viewBox="0 0 60 60" fill="none" stroke="rgba(255,255,255,0.92)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M30 6 L34 26 L54 30 L34 34 L30 54 L26 34 L6 30 L26 26 Z" />
      </svg>
    ),
  },
  {
    name: 'LangChain',
    mark: (
      <svg className="eco-mark" viewBox="0 0 60 60" fill="none" stroke="rgba(255,255,255,0.92)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <ellipse cx="22" cy="30" rx="13" ry="10" transform="rotate(-20 22 30)" />
        <ellipse cx="38" cy="30" rx="13" ry="10" transform="rotate(-20 38 30)" />
      </svg>
    ),
  },
  {
    name: 'Ollama',
    mark: (
      <svg className="eco-mark" viewBox="0 0 60 60" fill="none" stroke="rgba(255,255,255,0.92)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M6 48 L22 24 L34 40 Z" />
        <path d="M26 48 L42 14 L54 48 Z" />
      </svg>
    ),
  },
]

const tools = [
  {
    fn: 'get_best_practices()',
    ret: 'structured[]',
    desc: 'Canonical patterns and anti-patterns per ecosystem, ranked by recency and adoption.',
    params: '{ ecosystem, topic? }',
  },
  {
    fn: 'get_latest_news()',
    ret: 'news[]',
    desc: 'Releases, deprecations, and changelog deltas — sourced and dated, never paraphrased.',
    params: '{ since, limit? }',
  },
  {
    fn: 'get_top_integrations()',
    ret: 'ranked[]',
    desc: 'Tools, SDKs, and providers ordered by signal — usage, mentions, sustained activity.',
    params: '{ ecosystem, surface? }',
  },
  {
    fn: 'search_ecosystem()',
    ret: 'results[]',
    desc: 'Free-form semantic search across the indexed corpus, scoped to one ecosystem or all five.',
    params: '{ q, scope?, k? }',
  },
]

const freeFeatures = [
  '100 calls / month',
  '2 ecosystems',
  '24-hour news lag',
  'Weekly index refresh',
]

const proFeatures = [
  '10,000 calls / month',
  'All ecosystems',
  'Real-time news stream',
  'Daily index refresh',
]

/* ─── Check icon ─── */
function Check({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      style={{ width: 16, height: 16, flexShrink: 0 }}
    >
      <path d="M3 8.5l3.2 3L13 5" />
    </svg>
  )
}

/* ─── Live badge ─── */
function LiveBadge() {
  return (
    <span
      aria-label="live"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 7,
        fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.16em',
        textTransform: 'uppercase', color: 'rgba(255,255,255,0.78)',
        padding: '5px 11px 5px 9px',
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.14)',
        borderRadius: 999,
      }}
    >
      <span style={{ position: 'relative', width: 7, height: 7, flexShrink: 0 }}>
        <span
          style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            background: '#6ddb9b',
            boxShadow: '0 0 8px rgba(109,219,155,0.9)',
          }}
          aria-hidden="true"
        />
        <span
          className="live-dot-ring"
          style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            background: '#6ddb9b',
          }}
          aria-hidden="true"
        />
      </span>
      live
    </span>
  )
}

export default function LandingPage() {
  return (
    <>
      {/* ══ Hero ══ */}
      <section style={{ padding: '88px 0 56px' }}>
        {/* Eyebrow */}
        <p
          style={{
            fontFamily: 'var(--font-mono)', fontSize: 11.5, letterSpacing: '0.18em',
            textTransform: 'uppercase', color: 'var(--ink-faint)',
            margin: '0 0 28px', display: 'flex', alignItems: 'center', gap: 12,
          }}
        >
          <span aria-hidden="true" style={{ width: 28, height: 1, background: 'rgba(255,255,255,0.35)', display: 'inline-block', flexShrink: 0 }} />
          ai ecosystem intelligence — api
        </p>

        {/* Headline */}
        <h1
          className="hero-headline"
          style={{
            fontFamily: 'var(--font-serif), Georgia, serif',
            fontWeight: 400, fontSize: 64, lineHeight: 1.04,
            letterSpacing: '-0.025em', margin: 0, color: 'var(--ink)',
          }}
        >
          Verified knowledge,
          <span className="hero-l2" style={{ display: 'block', marginLeft: 100 }}>
            built for{' '}
            <em
              style={{
                fontStyle: 'italic',
                background: 'linear-gradient(180deg, #7fc9a3 0%, #5fb085 60%, #3d8a65 100%)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              agents.
            </em>
          </span>
        </h1>

        {/* Hairline rule */}
        <div
          aria-hidden="true"
          style={{
            height: 1, maxWidth: 720,
            background: 'linear-gradient(90deg, rgba(255,255,255,0.28), rgba(255,255,255,0.04))',
            margin: '56px 0 28px',
          }}
        />

        {/* Footer grid */}
        <div
          style={{
            display: 'grid', gridTemplateColumns: '1fr auto',
            gap: 40, alignItems: 'end', maxWidth: 920,
          }}
          className="hero-foot"
        >
          <p style={{ color: 'var(--ink-muted)', fontSize: 16, lineHeight: 1.6, maxWidth: 480, margin: 0 }}>
            Strata is a single endpoint into the moving parts of the AI ecosystem —{' '}
            <strong style={{ color: 'var(--ink)', fontWeight: 500 }}>best practices, releases, integrations, and signal</strong>
            {' '}— verified, dated, and shaped for the agents reading it.
          </p>
          <div style={{ display: 'flex', gap: 12 }}>
            <Link href="/signup" className="mkt-btn btn-emerald">
              get api key <span className="btn-arrow">→</span>
            </Link>
            <a href="#methods" className="mkt-btn btn-ghost">read the docs</a>
          </div>
        </div>
      </section>

      {/* ══ Ecosystems ══ */}
      <section style={{ padding: '64px 0' }} id="ecosystems">
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 28, gap: 24 }}>
          <h2
            style={{
              fontFamily: 'var(--font-serif), Georgia, serif',
              fontWeight: 400, fontSize: 32, letterSpacing: '-0.02em',
              margin: 0, color: 'var(--ink)',
            }}
          >
            Ecosystems we track
          </h2>
          <span
            style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink-faint)' }}
          >
            5 indexed · refreshed continuously
          </span>
        </div>

        <div className="eco-grid">
          {ecosystems.map((eco) => (
            <div
              key={eco.name}
              className="glass shimmer eco-card"
              style={{ padding: '26px 20px 20px', textAlign: 'center' }}
            >
              <span
                style={{
                  display: 'block', width: 60, height: 60, margin: '6px auto 18px',
                  filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.35))',
                }}
              >
                {eco.mark}
              </span>
              <p
                style={{
                  fontFamily: 'var(--font-serif), Georgia, serif',
                  fontSize: 18, letterSpacing: '-0.01em', margin: '0 0 14px', color: 'var(--ink)',
                }}
              >
                {eco.name}
              </p>
              <LiveBadge />
            </div>
          ))}
        </div>
      </section>

      {/* ══ API Methods ══ */}
      <section style={{ padding: '64px 0' }} id="methods">
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 28, gap: 24 }}>
          <h2
            style={{
              fontFamily: 'var(--font-serif), Georgia, serif',
              fontWeight: 400, fontSize: 32, letterSpacing: '-0.02em',
              margin: 0, color: 'var(--ink)',
            }}
          >
            One endpoint. Four verbs.
          </h2>
          <span
            style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink-faint)' }}
          >
            api/v1 · rest + sse
          </span>
        </div>

        <div className="glass" style={{ padding: 14 }}>
          {tools.map((tool, i) => (
            <div
              key={tool.fn}
              className="api-row"
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(280px,360px) 1fr auto',
                gap: 28,
                alignItems: 'center',
                padding: '22px 24px',
                borderLeft: '2px solid var(--emerald-bright)',
                borderRadius: 14,
                marginTop: i > 0 ? 4 : 0,
                borderTop: i > 0 ? '1px solid rgba(255,255,255,0.06)' : undefined,
              }}
            >
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14.5, color: 'var(--ink)', whiteSpace: 'nowrap' }}>
                {tool.fn}
                <span style={{ color: 'var(--ink-faint)', margin: '0 6px' }}>→</span>
                <span style={{ color: 'var(--emerald-glow)' }}>{tool.ret}</span>
              </div>
              <div style={{ fontSize: 14, color: 'var(--ink-muted)', lineHeight: 1.5 }}>
                {tool.desc}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--ink-faint)', textAlign: 'right', whiteSpace: 'nowrap' }}>
                {tool.params}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══ MCP callout ══ */}
      <div style={{
        borderTop: '1px solid var(--rule)',
        borderBottom: '1px solid var(--rule)',
        padding: '18px 0',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        <span style={{ color: '#1D9E75', fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, letterSpacing: '0.05em', flexShrink: 0 }}>MCP READY</span>
        <span style={{ color: 'var(--ink-muted)', fontSize: 14 }}>
          Also available as a native MCP server — connect once, access all tools automatically.
        </span>
        <a href="/docs#mcp-server" style={{ marginLeft: 'auto', color: '#1D9E75', fontSize: 13, fontFamily: 'var(--font-mono)', flexShrink: 0, whiteSpace: 'nowrap' }}>
          view docs →
        </a>
      </div>

      {/* ══ Pricing ══ */}
      <section style={{ padding: '64px 0' }} id="pricing">
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 28, gap: 24 }}>
          <h2
            style={{
              fontFamily: 'var(--font-serif), Georgia, serif',
              fontWeight: 400, fontSize: 32, letterSpacing: '-0.02em',
              margin: 0, color: 'var(--ink)',
            }}
          >
            Pricing
          </h2>
          <span
            style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink-faint)' }}
          >
            no card · cancel anytime
          </span>
        </div>

        <div className="pricing-grid">
          {/* Free card */}
          <div className="glass shimmer price-card" style={{ padding: '36px 36px 32px', borderRadius: 26 }}>
            <span className="plan-tag">Free</span>
            <div style={{ fontFamily: 'var(--font-serif), Georgia, serif', fontWeight: 400, fontSize: 52, letterSpacing: '-0.02em', lineHeight: 1, margin: '24px 0 8px' }}>
              $0
              <em style={{ fontFamily: 'var(--font-sans)', fontSize: 15, color: 'var(--ink-muted)', letterSpacing: 0, marginLeft: 4, fontStyle: 'normal' }}>
                / forever
              </em>
            </div>
            <p style={{ fontSize: 14, color: 'var(--ink-muted)', margin: '0 0 26px' }}>
              Everything you need to wire up a prototype agent.
            </p>
            <ul className="feat-list" role="list">
              {freeFeatures.map((f) => (
                <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 14, color: 'var(--ink)', padding: '10px 0', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                  <Check className="text-[var(--emerald-glow)]" />
                  {f}
                </li>
              ))}
            </ul>
            <Link href="/signup" className="mkt-btn btn-outline">
              start free <span className="btn-arrow">→</span>
            </Link>
          </div>

          {/* Pro card */}
          <div className="price-card-pro price-card" style={{ padding: '36px 36px 32px', borderRadius: 26, color: 'white' }}>
            <span className="plan-tag" style={{ background: 'rgba(255,255,255,0.18)', borderColor: 'rgba(255,255,255,0.3)', color: 'rgba(255,255,255,0.95)' }}>
              Pro
            </span>
            <div style={{ fontFamily: 'var(--font-serif), Georgia, serif', fontWeight: 400, fontSize: 52, letterSpacing: '-0.02em', lineHeight: 1, margin: '24px 0 8px', position: 'relative', zIndex: 1 }}>
              $29
              <em style={{ fontFamily: 'var(--font-sans)', fontSize: 15, color: 'rgba(255,255,255,0.75)', letterSpacing: 0, marginLeft: 4, fontStyle: 'normal' }}>
                / month
              </em>
            </div>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.78)', margin: '0 0 26px', position: 'relative', zIndex: 1 }}>
              Production-grade access for teams shipping real agents.
            </p>
            <ul className="feat-list" role="list" style={{ position: 'relative', zIndex: 1 }}>
              {proFeatures.map((f, i) => (
                <li
                  key={f}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, fontSize: 14, color: 'white', padding: '10px 0',
                    borderTop: `1px solid ${i === 0 ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.18)'}`,
                  }}
                >
                  <Check className="text-[#d4f5e2]" />
                  {f}
                </li>
              ))}
            </ul>
            <Link href="/signup" className="mkt-btn btn-white" style={{ position: 'relative', zIndex: 1 }}>
              get pro access <span className="btn-arrow">→</span>
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
