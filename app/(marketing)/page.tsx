import { Glass } from '@/components/ui/glass'
import { Btn } from '@/components/ui/button'
import { LiveBadge } from '@/components/ui/live-badge'
import { SectionHeading } from '@/components/ui/section-heading'

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
    transport: 'rest+mcp',
  },
  {
    fn: 'get_latest_news()',
    ret: 'news[]',
    desc: 'Releases, deprecations, and changelog deltas — sourced and dated, never paraphrased.',
    params: '{ since, limit? }',
    transport: 'rest+mcp',
  },
  {
    fn: 'get_top_integrations()',
    ret: 'ranked[]',
    desc: 'Tools, SDKs, and providers ordered by signal — usage, mentions, sustained activity.',
    params: '{ ecosystem, surface? }',
    transport: 'rest+mcp',
  },
  {
    fn: 'search_ecosystem()',
    ret: 'results[]',
    desc: 'Free-form semantic search across the indexed corpus, scoped to one ecosystem or all five.',
    params: '{ q, scope?, k? }',
    transport: 'rest+mcp',
  },
]

const freeFeatures = ['100 calls / month', '2 ecosystems', '24-hour news lag', 'Weekly index refresh']
const proFeatures  = ['10,000 calls / month', 'All ecosystems', 'Real-time news stream', 'Daily index refresh']

function Check({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
      className={className} style={{ width: 16, height: 16, flexShrink: 0 }}>
      <path d="M3 8.5l3.2 3L13 5" />
    </svg>
  )
}

export default function LandingPage() {
  return (
    <>
      {/* ══ Hero ══ */}
      <section style={{ padding: '96px 0 64px' }}>
        {/* Eyebrow */}
        <p style={{
          fontFamily: 'var(--font-mono)', fontSize: 11.5, fontWeight: 500,
          letterSpacing: '0.20em', textTransform: 'uppercase', color: 'var(--ink-faint)',
          margin: '0 0 32px', display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <span aria-hidden="true" style={{ width: 32, height: 1, background: 'rgba(255,255,255,0.35)', display: 'inline-block', flexShrink: 0 }} />
          ai ecosystem intelligence — api & mcp
        </p>

        {/* Headline */}
        <h1
          className="hero-headline"
          style={{
            fontFamily: 'var(--font-serif)',
            fontWeight: 500, fontSize: 72, lineHeight: 1.02,
            letterSpacing: '-0.025em', margin: 0, color: 'var(--ink)',
          }}
        >
          Verified knowledge,
          <span className="hero-l2" style={{ display: 'block', marginLeft: 100 }}>
            built for{' '}
            <em style={{
              fontStyle: 'italic',
              background: 'linear-gradient(180deg, #b6f0d3 0%, #5fb085 55%, #3d8a65 100%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 0 24px rgba(95,176,133,0.35))',
            }}>
              agents.
            </em>
          </span>
        </h1>

        {/* Hairline rule */}
        <div aria-hidden="true" style={{
          height: 1, maxWidth: 720,
          background: 'linear-gradient(90deg, rgba(255,255,255,0.30), rgba(255,255,255,0.02))',
          margin: '60px 0 28px',
        }} />

        {/* Footer grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 40, alignItems: 'end', maxWidth: 940 }} className="hero-foot">
          <p style={{ color: 'var(--ink-soft)', fontSize: 16.5, lineHeight: 1.6, maxWidth: 480, margin: 0 }}>
            Strata is the API and MCP server for the moving parts of the AI ecosystem —{' '}
            <strong style={{ color: 'var(--ink)', fontWeight: 500 }}>best practices, releases, integrations, and signal</strong>
            {' '}— verified, dated, and shaped for the agents reading it.
          </p>
          <div style={{ display: 'flex', gap: 12 }}>
            <Btn variant="emerald" href="/signup">get api key</Btn>
            <Btn variant="ghost" href="/docs" arrow={false}>read the docs</Btn>
          </div>
        </div>
      </section>

      {/* ══ Ecosystems ══ */}
      <section style={{ padding: '72px 0' }} id="ecosystems">
        <SectionHeading title="Ecosystems we track" meta="5 indexed · refreshed continuously" />
        <div className="eco-grid">
          {ecosystems.map((eco) => (
            <Glass key={eco.name} shimmer className="eco-card" style={{ padding: '28px 20px 22px', textAlign: 'center' }}>
              <span style={{ display: 'block', width: 60, height: 60, margin: '6px auto 18px', filter: 'drop-shadow(0 4px 14px rgba(0,0,0,0.50))' }}>
                {eco.mark}
              </span>
              <p style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 400, letterSpacing: '-0.015em', margin: '0 0 14px', color: 'var(--ink)' }}>
                {eco.name}
              </p>
              <LiveBadge />
            </Glass>
          ))}
        </div>
      </section>

      {/* ══ API Methods ══ */}
      <section style={{ padding: '72px 0' }} id="methods">
        <SectionHeading title="One endpoint. Four verbs." meta="api/v1 · rest + mcp" />
        <Glass style={{ padding: 14 }}>
          {tools.map((tool, i) => (
            <div
              key={tool.fn}
              className="api-row"
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(280px,360px) 1fr auto',
                gap: 28, alignItems: 'center', padding: '22px 24px',
                borderLeft: '2px solid var(--emerald-bright)',
                borderRadius: 14,
                marginTop: i > 0 ? 4 : 0,
                borderTop: i > 0 ? '1px solid rgba(255,255,255,0.06)' : undefined,
              }}
            >
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 500, color: 'var(--ink)', whiteSpace: 'nowrap' }}>
                {tool.fn}
                <span style={{ color: 'var(--ink-faint)', margin: '0 6px', fontWeight: 400 }}>→</span>
                <span style={{ color: 'var(--emerald-glow)', fontWeight: 500 }}>{tool.ret}</span>
              </div>
              <div style={{ fontSize: 14.5, color: 'var(--ink-muted)', lineHeight: 1.55 }}>
                {tool.desc}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--ink-faint)', textAlign: 'right', whiteSpace: 'nowrap' }}>
                <div>{tool.params}</div>
                <div style={{ fontSize: 10, letterSpacing: '0.06em', marginTop: 4, textTransform: 'uppercase' }}>
                  {tool.transport === 'rest+mcp' ? 'REST + MCP' : tool.transport.toUpperCase()}
                </div>
              </div>
            </div>
          ))}
        </Glass>
      </section>

      {/* ══ MCP callout ══ */}
      <div style={{
        borderTop: '1px solid var(--hair)', borderBottom: '1px solid var(--hair)',
        padding: '18px 0', display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <span style={{ color: 'var(--emerald-glow)', fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, letterSpacing: '0.05em', flexShrink: 0 }}>MCP READY</span>
        <span style={{ color: 'var(--ink-muted)', fontSize: 14 }}>
          Also available as a native MCP server — connect once, access all tools automatically.
        </span>
        <a href="/docs#mcp-server" className="mkt-nav-link" style={{ marginLeft: 'auto', flexShrink: 0, whiteSpace: 'nowrap' }}>
          view docs →
        </a>
      </div>

      {/* ══ Pricing ══ */}
      <section style={{ padding: '72px 0' }} id="pricing">
        <SectionHeading title="Pricing" meta="no card · cancel anytime" />
        <div className="pricing-grid">
          {/* Free card */}
          <Glass shimmer className="price-card" style={{ padding: '38px 36px 32px', borderRadius: 26 }}>
            <span className="plan-tag">Free</span>
            <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 56, letterSpacing: '-0.02em', lineHeight: 1, margin: '24px 0 8px', color: 'var(--ink)' }}>
              $0
              <em style={{ fontFamily: 'var(--font-sans)', fontSize: 15, color: 'var(--ink-muted)', letterSpacing: '-0.005em', marginLeft: 6, fontStyle: 'normal' }}>
                / forever
              </em>
            </div>
            <p style={{ fontSize: 14.5, color: 'var(--ink-muted)', margin: '0 0 26px', lineHeight: 1.55 }}>
              Everything you need to wire up a prototype agent.
            </p>
            <ul className="feat-list" role="list">
              {freeFeatures.map((f, i) => (
                <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 14.5, color: 'var(--ink)', padding: '13px 0', borderTop: `1px solid ${i === 0 ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.08)'}` }}>
                  <Check className="text-[var(--emerald-glow)]" />
                  {f}
                </li>
              ))}
            </ul>
            <Btn variant="outline" href="/signup">start free</Btn>
          </Glass>

          {/* Pro card */}
          <div className="price-card-pro price-card" style={{ padding: '38px 36px 32px', borderRadius: 26 }}>
            <span className="plan-tag" style={{ background: 'rgba(255,255,255,0.20)', borderColor: 'rgba(255,255,255,0.34)', color: 'rgba(255,255,255,0.96)' }}>Pro</span>
            <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 56, letterSpacing: '-0.02em', lineHeight: 1, margin: '24px 0 8px', color: 'white' }}>
              $29
              <em style={{ fontFamily: 'var(--font-sans)', fontSize: 15, color: 'rgba(255,255,255,0.78)', letterSpacing: '-0.005em', marginLeft: 6, fontStyle: 'normal' }}>
                / month
              </em>
            </div>
            <p style={{ fontSize: 14.5, color: 'rgba(255,255,255,0.82)', margin: '0 0 26px', lineHeight: 1.55 }}>
              Production-grade access for teams shipping real agents.
            </p>
            <ul className="feat-list" role="list">
              {proFeatures.map((f, i) => (
                <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 14.5, color: 'white', padding: '13px 0', borderTop: `1px solid ${i === 0 ? 'rgba(255,255,255,0.32)' : 'rgba(255,255,255,0.18)'}` }}>
                  <Check className="text-[#d4f5e2]" />
                  {f}
                </li>
              ))}
            </ul>
            <Btn variant="white" href="/signup">get pro access</Btn>
          </div>
        </div>
      </section>
    </>
  )
}
