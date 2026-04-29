import { Glass } from '@/components/ui/glass'
import { Btn } from '@/components/ui/button'
import { LiveBadge } from '@/components/ui/live-badge'
import { SectionHeading } from '@/components/ui/section-heading'
import { EcosystemCarousel } from './EcosystemCarousel'

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
const proFeatures  = ['10,000 calls / month', 'All ecosystems', 'News updated every 12 hours', 'Daily index refresh']

function Check({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
      className={className} style={{ width: 16, height: 16, flexShrink: 0 }}>
      <path d="M3 8.5l3.2 3L13 5" />
    </svg>
  )
}

function AggregationGraphic() {
  const sources = [
    { y: 52,  label: 'anthropic.com' },
    { y: 108, label: 'github.com' },
    { y: 180, label: 'openai.com' },
    { y: 252, label: 'reddit.com' },
    { y: 308, label: 'rss feeds' },
  ]

  const inPaths = [
    'M 18,52  C 112,52  112,180 205,180',
    'M 18,108 C 112,108 112,180 205,180',
    'M 18,180 L 205,180',
    'M 18,252 C 112,252 112,180 205,180',
    'M 18,308 C 112,308 112,180 205,180',
  ]
  const outPaths = [
    'M 205,173 C 300,130 300,118 396,118',
    'M 205,187 C 300,242 300,242 396,242',
  ]

  const inDots: { p: number; dur: string; begin: string }[] = [
    { p: 0, dur: '3.2s', begin: '0s'   }, { p: 0, dur: '3.2s', begin: '1.6s' },
    { p: 1, dur: '2.8s', begin: '0.5s' }, { p: 1, dur: '2.8s', begin: '1.9s' },
    { p: 2, dur: '2.2s', begin: '0.9s' }, { p: 2, dur: '2.2s', begin: '2.1s' },
    { p: 3, dur: '3.0s', begin: '0.3s' }, { p: 3, dur: '3.0s', begin: '1.8s' },
    { p: 4, dur: '3.5s', begin: '0.7s' }, { p: 4, dur: '3.5s', begin: '2.3s' },
  ]
  const outDots: { p: number; dur: string; begin: string }[] = [
    { p: 0, dur: '2.0s', begin: '0.2s' }, { p: 0, dur: '2.0s', begin: '1.2s' },
    { p: 1, dur: '2.3s', begin: '0.8s' }, { p: 1, dur: '2.3s', begin: '1.9s' },
  ]

  return (
    <svg viewBox="0 0 420 360" width="420" height="360"
      style={{ maxWidth: '100%', overflow: 'visible' }} aria-hidden="true">

      {/* ── Input paths ── */}
      {inPaths.map((d, i) => (
        <path key={i} id={`hg-in-${i}`} d={d}
          fill="none" stroke="rgba(95,176,133,0.18)" strokeWidth="1" />
      ))}

      {/* ── Output paths ── */}
      {outPaths.map((d, i) => (
        <path key={i} id={`hg-out-${i}`} d={d}
          fill="none" stroke="rgba(95,176,133,0.18)" strokeWidth="1" />
      ))}

      {/* ── Column headers ── */}
      <text x="18" y="26" fontFamily="var(--font-mono)" fontSize="8"
        fill="rgba(255,255,255,0.22)" letterSpacing="0.18em">SOURCES</text>
      <text x="396" y="26" textAnchor="end" fontFamily="var(--font-mono)" fontSize="8"
        fill="rgba(255,255,255,0.22)" letterSpacing="0.18em">OUTPUT</text>

      {/* ── Source nodes + labels ── */}
      {sources.map(({ y, label }) => (
        <g key={y}>
          <circle cx="18" cy={y} r="4" fill="rgba(95,176,133,0.14)" stroke="rgba(95,176,133,0.50)" strokeWidth="1" />
          <circle cx="18" cy={y} r="1.8" fill="rgba(95,176,133,0.9)" />
          <text x="29" y={y + 3.5} fontFamily="var(--font-mono)" fontSize="8.5"
            fill="rgba(255,255,255,0.28)" letterSpacing="0.04em">{label}</text>
        </g>
      ))}

      {/* ── Center ripple ── */}
      <circle cx="205" cy="180" r="36" fill="none" stroke="rgba(95,176,133,0.15)" strokeWidth="1">
        <animate attributeName="r" values="36;58;36" dur="2.8s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.4;0;0.4" dur="2.8s" repeatCount="indefinite" />
      </circle>
      <circle cx="205" cy="180" r="36" fill="none" stroke="rgba(95,176,133,0.08)" strokeWidth="1">
        <animate attributeName="r" values="36;52;36" dur="2.8s" begin="0.6s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.3;0;0.3" dur="2.8s" begin="0.6s" repeatCount="indefinite" />
      </circle>

      {/* ── Center node ── */}
      <circle cx="205" cy="180" r="35" fill="rgba(95,176,133,0.09)" stroke="rgba(95,176,133,0.48)" strokeWidth="1.5" />
      <circle cx="205" cy="180" r="27" fill="rgba(95,176,133,0.05)" stroke="rgba(95,176,133,0.18)" strokeWidth="1" />
      {/* Slow rotation ring */}
      <circle cx="205" cy="180" r="30" fill="none" stroke="rgba(95,176,133,0.22)" strokeWidth="1"
        strokeDasharray="8 6">
        <animateTransform attributeName="transform" type="rotate"
          from="0 205 180" to="360 205 180" dur="12s" repeatCount="indefinite" />
      </circle>
      <text x="205" y="177" textAnchor="middle" fontFamily="var(--font-mono)"
        fontSize="9" fill="rgba(255,255,255,0.88)" letterSpacing="0.18em">STRATA</text>
      <text x="205" y="191" textAnchor="middle" fontFamily="var(--font-mono)"
        fontSize="6.5" fill="rgba(95,176,133,0.72)" letterSpacing="0.10em">verified</text>

      {/* ── Output nodes ── */}
      <circle cx="396" cy="118" r="5" fill="rgba(95,176,133,0.16)" stroke="rgba(95,176,133,0.62)" strokeWidth="1.2" />
      <circle cx="396" cy="242" r="5" fill="rgba(95,176,133,0.16)" stroke="rgba(95,176,133,0.62)" strokeWidth="1.2" />

      {/* ── Output labels ── */}
      <text x="385" y="114" textAnchor="end" fontFamily="var(--font-mono)" fontSize="9"
        fill="rgba(255,255,255,0.40)" letterSpacing="0.05em">/api/v1</text>
      <text x="385" y="238" textAnchor="end" fontFamily="var(--font-mono)" fontSize="9"
        fill="rgba(255,255,255,0.40)" letterSpacing="0.05em">/mcp</text>

      {/* ── Blinking cursors ── */}
      <rect x="404" y="109" width="5" height="9" rx="1" fill="rgba(95,176,133,0.75)">
        <animate attributeName="opacity" values="1;0;1" dur="1.4s" repeatCount="indefinite" />
      </rect>
      <rect x="404" y="233" width="5" height="9" rx="1" fill="rgba(95,176,133,0.75)">
        <animate attributeName="opacity" values="1;0;1" dur="1.1s" begin="0.55s" repeatCount="indefinite" />
      </rect>

      {/* ── Traveling dots — input ── */}
      {inDots.map((dot, i) => (
        <circle key={i} r="2.2" fill="#5fb085">
          <animateMotion dur={dot.dur} begin={dot.begin} repeatCount="indefinite">
            <mpath href={`#hg-in-${dot.p}`} />
          </animateMotion>
          <animate attributeName="opacity" values="0;1;1;0"
            keyTimes="0;0.08;0.88;1" dur={dot.dur} begin={dot.begin} repeatCount="indefinite" />
        </circle>
      ))}

      {/* ── Traveling dots — output ── */}
      {outDots.map((dot, i) => (
        <circle key={`o${i}`} r="2.2" fill="#9be0bd">
          <animateMotion dur={dot.dur} begin={dot.begin} repeatCount="indefinite">
            <mpath href={`#hg-out-${dot.p}`} />
          </animateMotion>
          <animate attributeName="opacity" values="0;1;1;0"
            keyTimes="0;0.08;0.88;1" dur={dot.dur} begin={dot.begin} repeatCount="indefinite" />
        </circle>
      ))}
    </svg>
  )
}

export default function LandingPage() {
  return (
    <>
      {/* ══ Hero ══ */}
      <section style={{ padding: '96px 0 64px' }}>
        <div className="hero-grid">
          {/* ── Left: copy ── */}
          <div>
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
              height: 1, maxWidth: 560,
              background: 'linear-gradient(90deg, rgba(255,255,255,0.30), rgba(255,255,255,0.02))',
              margin: '60px 0 28px',
            }} />

            {/* Body + buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 32, alignItems: 'end' }} className="hero-foot">
              <p style={{ color: 'var(--ink-soft)', fontSize: 16.5, lineHeight: 1.6, maxWidth: 420, margin: 0 }}>
                Strata is the API and MCP server for the moving parts of the AI ecosystem —{' '}
                <strong style={{ color: 'var(--ink)', fontWeight: 500 }}>best practices, releases, integrations, and signal</strong>
                {' '}— verified, dated, and shaped for the agents reading it.
              </p>
              <div style={{ display: 'flex', gap: 12 }}>
                <Btn variant="emerald" href="/signup">get api key</Btn>
                <Btn variant="ghost" href="/docs" arrow={false}>read the docs</Btn>
              </div>
            </div>
          </div>

          {/* ── Right: aggregation graphic ── */}
          <div className="hero-graphic-col">
            <AggregationGraphic />
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

      {/* ══ Ecosystem Carousel ══ */}
      <div style={{
        borderTop: '1px solid var(--hair)', borderBottom: '1px solid var(--hair)',
        padding: '48px 0', overflow: 'hidden',
      }}>
        <EcosystemCarousel />
      </div>

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

      {/* ══ Community ══ */}
      <section style={{ padding: '72px 0' }}>
        <Glass shimmer style={{ padding: '72px 48px', textAlign: 'center' }}>
          <div style={{ maxWidth: 560, margin: '0 auto' }}>
            <p style={{
              fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500,
              letterSpacing: '0.20em', textTransform: 'uppercase', color: 'var(--ink-faint)',
              marginBottom: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
            }}>
              <span aria-hidden="true" style={{ width: 24, height: 1, background: 'rgba(255,255,255,0.25)', display: 'inline-block' }} />
              community
              <span aria-hidden="true" style={{ width: 24, height: 1, background: 'rgba(255,255,255,0.25)', display: 'inline-block' }} />
            </p>

            <h2 style={{
              fontFamily: 'var(--font-serif)', fontSize: 48, fontWeight: 500,
              letterSpacing: '-0.025em', lineHeight: 1.08,
              color: 'var(--ink)', margin: '0 0 22px',
            }}>
              Intelligence that grows<br />with every developer.
            </h2>

            <p style={{
              fontSize: 16, color: 'var(--ink-soft)', lineHeight: 1.65,
              maxWidth: 420, margin: '0 auto 52px',
            }}>
              Every integration, tip, and breakthrough discovered by the community
              finds its way into Strata. The more developers use it, the sharper it gets.
            </p>

            {/* Hairline divider */}
            <div aria-hidden="true" style={{
              height: 1, maxWidth: 320, margin: '0 auto 48px',
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
            }} />

            <div style={{ display: 'flex', justifyContent: 'center', gap: 64, marginBottom: 52 }}>
              {[
                { value: '5',     label: 'ecosystems tracked' },
                { value: '4',     label: 'api tools' },
                { value: 'Daily', label: 'content updates' },
              ].map(({ value, label }) => (
                <div key={label}>
                  <p style={{
                    fontFamily: 'var(--font-serif)', fontSize: 40, fontWeight: 400,
                    color: 'var(--emerald-glow)', lineHeight: 1, marginBottom: 8,
                  }}>
                    {value}
                  </p>
                  <p style={{
                    fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 500,
                    letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-faint)',
                  }}>
                    {label}
                  </p>
                </div>
              ))}
            </div>

            <Btn variant="ghost" href="/dashboard/submit" arrow={false}>
              submit a contribution
            </Btn>
          </div>
        </Glass>
      </section>

      {/* ══ How It Works teaser ══ */}
      <div style={{
        borderTop: '1px solid var(--hair)', borderBottom: '1px solid var(--hair)',
        padding: '64px 0',
      }}>
        <div className="hiw-pipeline-grid">
          {/* Left: copy */}
          <div>
            <p style={{
              fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500,
              letterSpacing: '0.20em', textTransform: 'uppercase', color: '#00c472',
              margin: '0 0 16px',
            }}>
              content integrity
            </p>
            <h2 style={{
              fontFamily: 'var(--font-serif)', fontSize: 30, fontWeight: 400,
              letterSpacing: '-0.02em', lineHeight: 1.18,
              color: 'var(--ink)', margin: '0 0 16px',
            }}>
              Not all signals are equal.
            </h2>
            <p style={{
              fontSize: 15, color: 'var(--ink-muted)', lineHeight: 1.65,
              margin: '0 0 24px',
            }}>
              Every item passes through source filtering, AI review,
              deduplication, and community moderation — so your agents get
              signal, not noise.
            </p>
            <a href="/how-it-works" style={{
              fontSize: 14, color: '#00c472', fontWeight: 500, textDecoration: 'none',
            }}>
              How validation works →
            </a>
          </div>

          {/* Right: pipeline visual */}
          <div className="hiw-pipeline-visual" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { label: 'source collection', badge: '4 sources',    live: false },
              { label: 'recency filter',    badge: '7 day window', live: false },
              { label: 'deduplication',     badge: 'url matched',  live: false },
              { label: 'ai validation',     badge: '4 criteria',   live: false },
              { label: 'published',         badge: 'live',         live: true  },
            ].map(({ label, badge, live }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 500,
                  letterSpacing: '0.12em', textTransform: 'uppercase',
                  color: 'var(--ink-faint)', width: 130, flexShrink: 0,
                }}>
                  {label}
                </span>
                <div style={{ flex: 1, height: 0, borderTop: '1px dashed rgba(255,255,255,0.12)' }} />
                {live ? (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 500,
                    color: 'var(--emerald-glow)',
                    border: '1px solid rgba(95,176,133,0.35)',
                    borderRadius: 999,
                    padding: '3px 10px',
                    whiteSpace: 'nowrap',
                  }}>
                    <span style={{ position: 'relative', width: 6, height: 6, flexShrink: 0 }}>
                      <span style={{
                        position: 'absolute', inset: 0, borderRadius: '50%',
                        background: 'var(--emerald-glow)',
                      }} />
                      <span
                        className="live-dot-ring"
                        style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'var(--emerald-glow)' }}
                        aria-hidden="true"
                      />
                    </span>
                    live
                  </span>
                ) : (
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 500,
                    color: 'var(--ink-muted)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 999,
                    padding: '3px 10px',
                    whiteSpace: 'nowrap',
                  }}>
                    {badge}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
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
