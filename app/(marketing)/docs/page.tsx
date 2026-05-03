import type { Metadata } from 'next'
import Link from 'next/link'
import { Glass } from '@/components/ui/glass'
import { CodeBlock } from './_components/CodeBlock'

export const metadata: Metadata = {
  title: 'API & MCP Docs — Strata',
  description:
    'REST API and MCP server reference for Strata. Verify MCP servers, search the directory, and pull AI ecosystem intelligence with a single API key.',
}

const eyebrowStyle = {
  fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500,
  letterSpacing: '0.20em', textTransform: 'uppercase' as const,
  color: 'var(--emerald-glow)', margin: 0,
}

const h2Style = {
  fontFamily: 'var(--font-serif)', fontSize: 36, fontWeight: 400,
  letterSpacing: '-0.02em', lineHeight: 1.1,
  color: 'var(--ink)', margin: '0 0 16px',
}

const bodyStyle = {
  fontSize: 15, color: 'var(--ink-soft)', lineHeight: 1.7, margin: '0 0 14px',
}

const sectionStyle = { marginTop: 80 }

function Section({ id, eyebrow, title, children }: {
  id: string; eyebrow: string; title: string; children: React.ReactNode
}) {
  return (
    <section id={id} style={sectionStyle}>
      <p style={{ ...eyebrowStyle, marginBottom: 16 }}>{eyebrow}</p>
      <h2 style={h2Style}>{title}</h2>
      {children}
    </section>
  )
}

const METHOD_COLOR: Record<string, string> = {
  GET:  'rgba(95,176,133,0.9)',
  POST: 'rgba(96,165,250,0.9)',
}

type AuthBadge = 'key' | 'anon-or-key'

function RoutePanel({ method, path, auth, description, children }: {
  method: 'GET' | 'POST'
  path: string
  auth: AuthBadge
  description: string
  children?: React.ReactNode
}) {
  return (
    <Glass style={{ padding: '22px 28px', marginBottom: 12, borderLeft: '2px solid var(--emerald-bright)' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginBottom: 10 }}>
        <code style={{
          fontFamily: 'var(--font-mono)', fontSize: 11.5, fontWeight: 700,
          letterSpacing: '0.08em', color: METHOD_COLOR[method],
        }}>
          {method}
        </code>
        <code style={{
          fontFamily: 'var(--font-mono)', fontSize: 13.5, fontWeight: 500,
          color: 'var(--ink)',
        }}>
          {path}
        </code>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 9.5, fontWeight: 600,
          letterSpacing: '0.14em', textTransform: 'uppercase',
          color: auth === 'key' ? 'rgba(245,158,11,0.9)' : 'rgba(95,176,133,0.75)',
          border: `1px solid ${auth === 'key' ? 'rgba(245,158,11,0.25)' : 'rgba(95,176,133,0.25)'}`,
          borderRadius: 999, padding: '2px 9px',
        }}>
          {auth === 'key' ? 'key required' : 'anon or key'}
        </span>
      </div>
      <p style={{ ...bodyStyle, marginBottom: children ? 12 : 0 }}>{description}</p>
      {children}
    </Glass>
  )
}

// ── Code examples ────────────────────────────────────────────────────────────

const CURL_AUTH = `# X-API-Key header
curl https://strata.dev/api/v1/best-practices?ecosystem=claude \\
  -H "X-API-Key: sk_your_key_here"

# Bearer token (same key)
curl https://strata.dev/api/v1/best-practices?ecosystem=claude \\
  -H "Authorization: Bearer sk_your_key_here"`

const CURL_VERIFY = `curl "https://strata.dev/api/v1/mcp/verify?url=https://github.com/microsoft/playwright-mcp" \\
  -H "X-API-Key: sk_..."

# Response
{
  "found": true,
  "risk_level": "low",
  "trusted": true,
  "security_score": 78,
  "runtime_score": 65,
  "capability_flags": ["net_egress"],
  "hosted_endpoint": null,
  "tool_count": 12,
  "is_quarantined": false
}`

const CURL_VERIFY_BULK = `curl -X POST https://strata.dev/api/v1/mcp/verify-bulk \\
  -H "X-API-Key: sk_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "identifiers": [
      { "url": "https://github.com/microsoft/playwright-mcp" },
      { "npm": "@modelcontextprotocol/server-filesystem" },
      { "endpoint": "https://example.com/mcp" }
    ]
  }'

# X-Strata-Calls-Charged: 1  (ceil(3 / 10))`

const CURL_MCP_SERVERS = `curl "https://strata.dev/api/v1/mcp-servers?q=browser+automation&min_runtime_score=40" \\
  -H "X-API-Key: sk_..."

# Filters: q, min_security_score (default 30), min_runtime_score (default 0),
#          exclude_capability_flags (comma-separated), require_hosted (true/false)`

const CURL_BRIEF = `curl "https://strata.dev/api/v1/ecosystems/claude/brief" \\
  -H "X-API-Key: sk_..."

# Returns best_practices + news + integrations in one round trip`

const MCP_TOOLS = `# Connect any MCP client to https://strata.dev/mcp
# Authenticate with X-API-Key or Authorization: Bearer

Available tools:
  get_best_practices(ecosystem)
  get_latest_news(ecosystem, limit?)
  get_top_integrations(ecosystem, use_case?)
  find_mcp_servers(query, limit?, min_security_score?, exclude_capability_flags?, require_hosted?)
  search_ecosystem(query, ecosystem?)
  list_ecosystems()`

const RATE_LIMIT_HEADERS = `X-RateLimit-Limit: 10000
X-RateLimit-Remaining: 9985
X-RateLimit-Reset: 2026-06-01T00:00:00.000Z`

const FREE_TIER_EXAMPLE = `# Anonymous — no key needed (10 req/hour per IP)
curl "https://strata.dev/api/v1/mcp/verify?url=https://github.com/microsoft/playwright-mcp"`

export default function ApiDocsPage() {
  return (
    <article style={{ maxWidth: 720, margin: '0 auto', padding: '80px 0 64px' }}>

      {/* ── Hero ── */}
      <p style={{ ...eyebrowStyle, marginBottom: 20 }}>rest api · mcp server</p>
      <h1 style={{
        fontFamily: 'var(--font-serif)', fontSize: 56, fontWeight: 500,
        letterSpacing: '-0.025em', lineHeight: 1.04,
        color: 'var(--ink)', margin: '0 0 20px',
      }}>
        API & MCP Reference
      </h1>
      <p style={{
        fontSize: 17, color: 'var(--ink-soft)', lineHeight: 1.6,
        maxWidth: 560, margin: '0 0 32px',
      }}>
        Verify MCP servers, search the directory, and pull AI ecosystem intelligence
        from any language. One key, two transports.
      </p>

      {/* quick links */}
      <div style={{
        display: 'flex', gap: 24, flexWrap: 'wrap',
        fontFamily: 'var(--font-mono)', fontSize: 11.5, fontWeight: 500,
        letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-faint)',
      }}>
        <a href="#auth" style={{ color: 'var(--emerald-glow)' }}>authentication →</a>
        <a href="#verify" style={{ color: 'var(--emerald-glow)' }}>mcp verify →</a>
        <a href="#directory" style={{ color: 'var(--emerald-glow)' }}>mcp directory →</a>
        <a href="#ecosystem" style={{ color: 'var(--emerald-glow)' }}>ecosystem intel →</a>
        <a href="#mcp-server" style={{ color: 'var(--emerald-glow)' }}>mcp server →</a>
        <Link href="/docs/sdk" style={{ color: 'var(--emerald-glow)' }}>typescript sdk →</Link>
      </div>

      {/* ── Base URL ── */}
      <Section id="base-url" eyebrow="base url" title="Endpoints">
        <Glass style={{ padding: '18px 24px', display: 'flex', gap: 32, flexWrap: 'wrap' }}>
          <div>
            <p style={{ ...eyebrowStyle, fontSize: 9.5, marginBottom: 6 }}>REST API</p>
            <code style={{ fontFamily: 'var(--font-mono)', fontSize: 13.5, color: 'var(--ink)' }}>
              https://strata.dev/api/v1
            </code>
          </div>
          <div>
            <p style={{ ...eyebrowStyle, fontSize: 9.5, marginBottom: 6 }}>MCP Server</p>
            <code style={{ fontFamily: 'var(--font-mono)', fontSize: 13.5, color: 'var(--ink)' }}>
              https://strata.dev/mcp
            </code>
          </div>
        </Glass>
      </Section>

      {/* ── Authentication ── */}
      <Section id="auth" eyebrow="authentication" title="One key, two headers.">
        <p style={bodyStyle}>
          All authenticated routes accept either <code>X-API-Key</code> or{' '}
          <code>Authorization: Bearer</code> with your <code>sk_...</code> key.
          Keys are scoped to your account and tied to your monthly call quota.
        </p>
        <CodeBlock code={CURL_AUTH} lang="shell" />

        <p style={{ ...bodyStyle, marginTop: 20 }}>
          <strong style={{ color: 'var(--ink)' }}>Anonymous tier</strong> — routes marked{' '}
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 11, color: 'rgba(95,176,133,0.75)',
            border: '1px solid rgba(95,176,133,0.25)', borderRadius: 999, padding: '1px 7px',
          }}>
            anon or key
          </span>{' '}
          allow unauthenticated access at 10 req/hour per IP. Useful for one-off verifications.
        </p>
        <CodeBlock code={FREE_TIER_EXAMPLE} lang="shell" />

        <Glass style={{ padding: '18px 24px', marginTop: 4 }}>
          <p style={{ ...eyebrowStyle, fontSize: 9.5, marginBottom: 12 }}>Rate-limit response headers</p>
          <pre style={{
            fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--ink-muted)',
            margin: 0, lineHeight: 1.7,
          }}>
            {RATE_LIMIT_HEADERS}
          </pre>
        </Glass>

        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16,
        }}>
          {[
            { tier: 'Free', limit: '100 calls / month', rate: '100 req/min REST, 30/min MCP' },
            { tier: 'Pro', limit: '10,000 calls / month', rate: '100 req/min REST, 30/min MCP' },
          ].map(t => (
            <Glass key={t.tier} style={{ padding: '18px 20px' }}>
              <p style={{
                fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600,
                letterSpacing: '0.16em', textTransform: 'uppercase',
                color: 'var(--emerald-glow)', margin: '0 0 8px',
              }}>
                {t.tier}
              </p>
              <p style={{ fontSize: 13.5, color: 'var(--ink)', fontWeight: 500, margin: '0 0 4px' }}>
                {t.limit}
              </p>
              <p style={{ fontSize: 12.5, color: 'var(--ink-muted)', margin: 0 }}>{t.rate}</p>
            </Glass>
          ))}
        </div>
      </Section>

      {/* ── MCP Verify ── */}
      <Section id="verify" eyebrow="mcp verification" title="Verify any MCP server.">
        <p style={bodyStyle}>
          Look up a server by GitHub URL, npm package name, or hosted MCP endpoint.
          Returns risk level, trust scores, capability flags, and quarantine status.
        </p>

        <RoutePanel
          method="GET"
          path="/api/v1/mcp/verify"
          auth="anon-or-key"
          description="Single MCP server lookup. Pass ?url=, ?npm=, or ?endpoint=. The only endpoint that surfaces quarantined servers — intentionally, so callers can warn about dangerous servers."
        >
          <CodeBlock code={CURL_VERIFY} lang="shell" />
        </RoutePanel>

        <RoutePanel
          method="POST"
          path="/api/v1/mcp/verify-bulk"
          auth="key"
          description="Batch lookup of up to 50 identifiers. Billed as ceil(N / 10) API calls — reported in X-Strata-Calls-Charged. Uses 3 parallel DB queries regardless of N."
        >
          <CodeBlock code={CURL_VERIFY_BULK} lang="shell" />
        </RoutePanel>
      </Section>

      {/* ── MCP Directory ── */}
      <Section id="directory" eyebrow="mcp directory" title="Search 2,000+ MCP servers.">
        <p style={bodyStyle}>
          Semantic search over the full MCP server directory using Voyage AI embeddings.
          Returns security score, runtime score, capability flags, and hosted endpoint if known.
          Quarantined and archived servers are always excluded.
        </p>

        <RoutePanel
          method="GET"
          path="/api/v1/mcp-servers"
          auth="anon-or-key"
          description="Semantic search. Accepts q (query), min_security_score, min_runtime_score, exclude_capability_flags (comma-separated), and require_hosted."
        >
          <CodeBlock code={CURL_MCP_SERVERS} lang="shell" />
        </RoutePanel>
      </Section>

      {/* ── Ecosystem Intel ── */}
      <Section id="ecosystem" eyebrow="ecosystem intelligence" title="AI ecosystem data.">
        <p style={bodyStyle}>
          Best practices, curated news, and top integrations for 21 AI ecosystems
          (Claude, OpenAI, Gemini, LangChain, Cursor, and more). Pro tier gets real-time
          results; free tier gets items older than 24 hours.
        </p>

        <RoutePanel
          method="GET"
          path="/api/v1/ecosystems/[slug]/brief"
          auth="key"
          description="Composite: best_practices + news + integrations in one round trip. Equivalent to calling all three routes in parallel."
        >
          <CodeBlock code={CURL_BRIEF} lang="shell" />
        </RoutePanel>

        <RoutePanel
          method="GET"
          path="/api/v1/best-practices"
          auth="key"
          description="Best practices for an ecosystem. Pass ?ecosystem=claude. Returns up to 10 items ordered by recency."
        />

        <RoutePanel
          method="GET"
          path="/api/v1/news"
          auth="key"
          description="Latest news for an ecosystem. Pass ?ecosystem=openai&limit=5. Pro receives real-time; free receives items older than 24 hours."
        />

        <RoutePanel
          method="GET"
          path="/api/v1/integrations"
          auth="key"
          description="Top integrations for an ecosystem. Pass ?ecosystem=langchain. Optionally filter by ?use_case= to run semantic search within the category."
        />

        <RoutePanel
          method="GET"
          path="/api/v1/search"
          auth="key"
          description="Full-text search across all content. Pass ?q= and optionally ?ecosystem= to scope. Returns items from all categories ranked by relevance."
        />

        {/* Ecosystem slugs */}
        <Glass style={{ padding: '20px 24px', marginTop: 8 }}>
          <p style={{ ...eyebrowStyle, fontSize: 9.5, marginBottom: 14 }}>Available ecosystem slugs</p>
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: 8,
            fontFamily: 'var(--font-mono)', fontSize: 11.5,
          }}>
            {[
              'claude','openai','gemini','langchain','ollama',
              'cursor','claudecode','codex','windsurf','copilot','cody',
              'perplexity','youcom','exa',
              'replicate','togetherai','groq','fireworks',
              'manus','higgsfield','v0','bolt',
            ].map(slug => (
              <code
                key={slug}
                style={{
                  color: 'var(--ink-muted)',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid var(--hair)',
                  borderRadius: 6, padding: '3px 9px',
                }}
              >
                {slug}
              </code>
            ))}
          </div>
          <p style={{ fontSize: 12.5, color: 'var(--ink-faint)', margin: '12px 0 0' }}>
            Free tier: <code>claude</code> and <code>openai</code> only.
            Pro tier: all 22 ecosystems.
          </p>
        </Glass>
      </Section>

      {/* ── MCP Server ── */}
      <Section id="mcp-server" eyebrow="mcp server" title="Connect any MCP client.">
        <p style={bodyStyle}>
          Strata exposes its intelligence as a native MCP server. Connect any MCP-compatible
          client — Claude Desktop, Claude Code, or a custom agent — directly to{' '}
          <code>https://strata.dev/mcp</code> and authenticate with your API key.
        </p>

        <Glass style={{ padding: '22px 28px', marginBottom: 12, borderLeft: '2px solid var(--emerald-bright)' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
            <code style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, fontWeight: 700, color: METHOD_COLOR.GET }}>GET</code>
            <code style={{ fontFamily: 'var(--font-mono)', fontSize: 13.5, color: 'var(--ink)' }}>/mcp</code>
          </div>
          <p style={{ ...bodyStyle, marginBottom: 0 }}>
            Returns the capability manifest — tools, prompts, and resources — for any MCP client that does capability discovery.
          </p>
        </Glass>

        <Glass style={{ padding: '22px 28px', marginBottom: 12, borderLeft: '2px solid var(--emerald-bright)' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
            <code style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, fontWeight: 700, color: METHOD_COLOR.POST }}>POST</code>
            <code style={{ fontFamily: 'var(--font-mono)', fontSize: 13.5, color: 'var(--ink)' }}>/mcp</code>
          </div>
          <p style={{ ...bodyStyle, marginBottom: 12 }}>
            Handles MCP tool calls over HTTP Streamable Transport. Auth via{' '}
            <code>X-API-Key</code> or <code>Authorization: Bearer</code>.
          </p>
          <CodeBlock code={MCP_TOOLS} lang="mcp" />
        </Glass>

        <Glass style={{ padding: '18px 24px', marginTop: 8 }}>
          <p style={{ ...eyebrowStyle, fontSize: 9.5, marginBottom: 12 }}>Claude Desktop config</p>
          <CodeBlock code={`{
  "mcpServers": {
    "strata": {
      "type": "http",
      "url": "https://strata.dev/mcp",
      "headers": { "X-API-Key": "sk_your_key_here" }
    }
  }
}`} lang="json" />
        </Glass>
      </Section>

      {/* ── Footer CTA ── */}
      <div style={{
        marginTop: 80, paddingTop: 40, borderTop: '1px solid var(--hair)',
        display: 'flex', gap: 32, flexWrap: 'wrap', alignItems: 'center',
      }}>
        <div>
          <p style={{ ...eyebrowStyle, marginBottom: 8 }}>TypeScript SDK</p>
          <p style={{ fontSize: 14, color: 'var(--ink-muted)', margin: 0 }}>
            Prefer a typed client over raw HTTP?{' '}
            <Link href="/docs/sdk" style={{ color: 'var(--emerald-glow)' }}>
              See the SDK docs →
            </Link>
          </p>
        </div>
        <div>
          <p style={{ ...eyebrowStyle, marginBottom: 8 }}>Get your key</p>
          <p style={{ fontSize: 14, color: 'var(--ink-muted)', margin: 0 }}>
            <Link href="/signup" style={{ color: 'var(--emerald-glow)' }}>
              Sign up for free →
            </Link>{' '}
            100 calls/month, no card required.
          </p>
        </div>
      </div>

    </article>
  )
}
