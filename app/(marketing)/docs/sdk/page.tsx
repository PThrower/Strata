import type { Metadata } from 'next'
import Link from 'next/link'
import { Glass } from '@/components/ui/glass'
import { CodeBlock } from '../_components/CodeBlock'

export const metadata: Metadata = {
  title: 'SDK — Strata',
  description:
    'Verify any MCP server in one line of code. Zero-dependency TypeScript SDK plus a GitHub Action that gates every PR on MCP supply-chain safety.',
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

const h3Style = {
  fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 400,
  letterSpacing: '-0.01em',
  color: 'var(--ink)', margin: '0 0 8px',
}

const bodyStyle = {
  fontSize: 15, color: 'var(--ink-soft)', lineHeight: 1.7, margin: '0 0 14px',
}

const sectionStyle = {
  marginTop: 80,
}

function Section({ id, eyebrow, title, children }: {
  id: string
  eyebrow: string
  title: string
  children: React.ReactNode
}) {
  return (
    <section id={id} style={sectionStyle}>
      <p style={{ ...eyebrowStyle, marginBottom: 16 }}>{eyebrow}</p>
      <h2 style={h2Style}>{title}</h2>
      {children}
    </section>
  )
}

function MethodPanel({ name, signature, description, children }: {
  name: string
  signature: string
  description: string
  children?: React.ReactNode
}) {
  return (
    <Glass style={{ padding: '28px 32px', marginBottom: 16 }}>
      <h3 style={{ ...h3Style, fontFamily: 'var(--font-mono)', fontSize: 18, marginBottom: 6 }}>
        {name}
      </h3>
      <p style={{
        fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--ink-muted)',
        lineHeight: 1.6, margin: '0 0 14px', whiteSpace: 'pre-wrap',
      }}>
        {signature}
      </p>
      <p style={{ ...bodyStyle, marginBottom: children ? 14 : 0 }}>{description}</p>
      {children}
    </Glass>
  )
}

const QUICKSTART = `import { Strata } from '@strata-ai/sdk'

const strata = new Strata({ apiKey: process.env.STRATA_API_KEY })

const result = await strata.verify(
  'https://github.com/microsoft/playwright-mcp'
)

console.log(result.risk_level)        // 'low'
console.log(result.capability_flags)  // ['fs_write', 'net_egress']
console.log(result.security_score)    // 85
console.log(result.runtime_score)     // 72`

const ANON = `// No API key — anonymous tier (10 req/hour per IP).
const strata = Strata.public()
await strata.verify('@modelcontextprotocol/server-filesystem')`

const VERIFY_ALL = `const results = await strata.verifyAll([
  '@modelcontextprotocol/server-filesystem',
  'https://github.com/microsoft/playwright-mcp',
  { endpoint: 'https://example.com/mcp' },
])

for (const r of results) {
  console.log(\`\${r.name}: \${r.risk_level}\`)
}`

const FIND_MCP = `const servers = await strata.findMCP('browser automation', {
  excludeCapabilities: ['shell_exec', 'dynamic_eval'],
  minSecurityScore: 50,
  minRuntimeScore: 40,
  requireHosted: false,
  limit: 5,
})`

const ECOSYSTEM = `const brief = await strata.ecosystem('claude')

console.log(brief.best_practices)  // 5 most recent best practices
console.log(brief.news)            // 10 most recent items
console.log(brief.integrations)    // 10 top integrations`

const CLI_VERIFY = `$ strata verify @modelcontextprotocol/server-filesystem
✓ @modelcontextprotocol/server-filesystem
  Risk: 🟢 low (security 85, runtime 72)
  Flags: fs_write, net_egress
  → https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem

$ strata verify github.com/owner/sketchy-mcp
✗ owner/sketchy-mcp
  Risk: 🔴 critical (security 12, runtime 8)
  Flags: shell_exec, dynamic_eval
  Reasons: exposes shell_exec; security_score 12 below 20`

const CLI_SCAN = `$ strata scan
Strata MCP Security Scan
~/Library/Application Support/Claude/claude_desktop_config.json

✓ @modelcontextprotocol/server-filesystem  🟢 low      security 85, runtime 72  [fs_write]
! @scope/risky-mcp                         🟠 high     security 60, runtime 30  [shell_exec]
? local-script  unverifiable — local node script

✓ 1 passed  ! 1 warnings  ✗ 0 critical  ? 1 unverifiable`

const ACTION_YML = `name: MCP Security
on: [pull_request, push]

permissions:
  contents: read
  pull-requests: write

jobs:
  strata:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: PThrower/strata-sdk/packages/action@v1
        with:
          strata_api_key: \${{ secrets.STRATA_API_KEY }}
          fail_on: critical`

const ERROR_HANDLING = `import {
  Strata,
  StrataAuthError,
  StrataRateLimitError,
  StrataValidationError,
  StrataNetworkError,
} from '@strata-ai/sdk'

try {
  await strata.verify(url)
} catch (err) {
  if (err instanceof StrataRateLimitError) {
    console.log('Reset at', err.resetAt)
    console.log('Remaining', err.remaining)
  }
}`

const RISK_TABLE: Array<{ emoji: string; level: string; cond: string }> = [
  { emoji: '🔴', level: 'critical', cond: 'is_quarantined: true OR security_score < 20' },
  { emoji: '🟠', level: 'high', cond: 'exposes shell_exec or dynamic_eval' },
  { emoji: '🟡', level: 'medium', cond: 'exposes fs_write or arbitrary_sql' },
  { emoji: '🟢', level: 'low', cond: 'none of the above (trusted = true)' },
  { emoji: '⚪', level: 'unknown', cond: 'server not in Strata directory' },
]

export default function SdkDocsPage() {
  return (
    <article style={{ maxWidth: 720, margin: '0 auto', padding: '80px 0 64px' }}>

      {/* ── Hero ── */}
      <p style={{ ...eyebrowStyle, marginBottom: 20 }}>typescript sdk</p>
      <h1 style={{
        fontFamily: 'var(--font-serif)', fontSize: 56, fontWeight: 500,
        letterSpacing: '-0.025em', lineHeight: 1.04,
        color: 'var(--ink)', margin: '0 0 20px',
      }}>
        One line. Every MCP server verified.
      </h1>
      <p style={{
        fontSize: 17, color: 'var(--ink-soft)', lineHeight: 1.6,
        maxWidth: 560, margin: '0 0 32px',
      }}>
        Zero-dependency TypeScript SDK with smart input detection,
        a CLI, and a GitHub Action that gates every PR on MCP supply-chain safety.
      </p>

      <CodeBlock code="npm install @strata-ai/sdk" lang="shell" />

      <div style={{
        marginTop: 28, display: 'flex', gap: 24, flexWrap: 'wrap',
        fontFamily: 'var(--font-mono)', fontSize: 11.5, fontWeight: 500,
        letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-faint)',
      }}>
        <a href="https://www.npmjs.com/package/@strata-ai/sdk" rel="noreferrer" style={{ color: 'var(--emerald-glow)' }}>
          npm →
        </a>
        <a href="https://github.com/PThrower/strata-sdk" rel="noreferrer" style={{ color: 'var(--emerald-glow)' }}>
          github →
        </a>
        <a href="https://github.com/marketplace/actions/strata-mcp-security-check" rel="noreferrer" style={{ color: 'var(--emerald-glow)' }}>
          marketplace →
        </a>
      </div>

      {/* ── Quick start ── */}
      <Section id="quick-start" eyebrow="quick start" title="Verify in 8 lines.">
        <p style={bodyStyle}>
          Pass any GitHub URL, npm package name, or hosted MCP endpoint.
          The SDK auto-detects the input shape.
        </p>
        <CodeBlock code={QUICKSTART} lang="typescript" />
      </Section>

      {/* ── Authentication ── */}
      <Section id="authentication" eyebrow="authentication" title="Key or anonymous.">
        <p style={bodyStyle}>
          With an API key, every authenticated route is available. Without one,
          the anonymous tier (10 req/hour per IP) covers <code>verify</code>{' '}
          and <code>findMCP</code>. <Link href="/signup" style={{ color: 'var(--emerald-glow)' }}>Get a free key →</Link>
        </p>
        <CodeBlock code={ANON} lang="typescript" />
      </Section>

      {/* ── API reference ── */}
      <Section id="api" eyebrow="api reference" title="Methods.">
        <MethodPanel
          name="verify(input)"
          signature="(input: string | VerifyInput) => Promise<VerifyResult>"
          description="Single-server lookup. Smart-detects GitHub URLs, npm packages, and hosted endpoints. Returns { found: false, risk_level: 'unknown' } for unknown servers — never throws for not-found."
        />
        <MethodPanel
          name="verifyAll(inputs)"
          signature="(inputs: Array<string | VerifyInput>) => Promise<VerifyResult[]>"
          description="Batch lookup. Order preserved. Uses single bulk POST when N > 5. Counts as ceil(N/10) calls against your monthly quota."
        >
          <CodeBlock code={VERIFY_ALL} lang="typescript" />
        </MethodPanel>
        <MethodPanel
          name="findMCP(query, options?)"
          signature="(query: string, options?: FindMCPOptions) => Promise<McpServer[]>"
          description="Semantic search across Strata's directory. Quarantined and archived servers are excluded automatically."
        >
          <CodeBlock code={FIND_MCP} lang="typescript" />
        </MethodPanel>
        <MethodPanel
          name="ecosystem(slug)"
          signature="(slug: string) => Promise<EcosystemBrief>"
          description="Composite intelligence brief — best practices, news, integrations — in one round trip. Requires authentication."
        >
          <CodeBlock code={ECOSYSTEM} lang="typescript" />
        </MethodPanel>
      </Section>

      {/* ── Risk levels ── */}
      <Section id="risk-levels" eyebrow="risk model" title="Five levels, conservative by default.">
        <p style={bodyStyle}>
          Strata maps every server to one of five levels. <code>trusted: true</code>{' '}
          is set only at <code>low</code>.
        </p>
        <Glass style={{ padding: '8px 8px' }}>
          {RISK_TABLE.map((row, i) => (
            <div
              key={row.level}
              style={{
                display: 'grid', gridTemplateColumns: '36px 92px 1fr', gap: 16,
                padding: '14px 18px',
                borderTop: i === 0 ? 'none' : '1px solid var(--hair)',
                alignItems: 'center',
              }}
            >
              <span style={{ fontSize: 18, lineHeight: 1 }}>{row.emoji}</span>
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 12.5, fontWeight: 600,
                color: 'var(--ink)',
              }}>
                {row.level}
              </span>
              <span style={{ fontSize: 13.5, color: 'var(--ink-soft)', lineHeight: 1.55 }}>
                {row.cond}
              </span>
            </div>
          ))}
        </Glass>
      </Section>

      {/* ── CLI ── */}
      <Section id="cli" eyebrow="cli" title="strata verify · strata scan">
        <p style={bodyStyle}>
          The package ships a <code>strata</code> binary. <code>verify</code>{' '}
          checks one server. <code>scan</code> walks an MCP client config and
          verifies every entry — defaults to your Claude Desktop config path.
        </p>
        <CodeBlock code={CLI_VERIFY} lang="shell" />
        <CodeBlock code={CLI_SCAN} lang="shell" />
        <p style={{ ...bodyStyle, fontSize: 13.5, color: 'var(--ink-muted)' }}>
          Exit codes: <code>0</code> ok, <code>1</code> if any server breaches{' '}
          <code>--fail-on</code>, <code>2</code> internal error. Pass{' '}
          <code>--json</code> for parseable output.
        </p>
      </Section>

      {/* ── GitHub Action ── */}
      <Section id="github-action" eyebrow="github action" title="Gate every PR.">
        <p style={bodyStyle}>
          Drop this into <code>.github/workflows/</code>. The action finds every
          MCP server reference in the repo (Claude Desktop / Cursor / Cline configs,{' '}
          <code>mcp.json</code>, <code>package.json</code> with an{' '}
          <code>mcp</code> field), verifies each one, and posts an idempotent PR
          comment with the trust report.
        </p>
        <CodeBlock code={ACTION_YML} lang="yaml" />
        <p style={{ ...bodyStyle, fontSize: 13.5, color: 'var(--ink-muted)' }}>
          <strong style={{ color: 'var(--ink-soft)' }}>fail_on:</strong>{' '}
          <code>critical</code> | <code>high</code> | <code>medium</code>.
          Re-runs UPDATE the same comment instead of stacking.
          {' '}
          <a href="https://github.com/PThrower/strata-sdk/tree/main/packages/action" rel="noreferrer" style={{ color: 'var(--emerald-glow)' }}>
            Full action README →
          </a>
        </p>
      </Section>

      {/* ── Errors ── */}
      <Section id="errors" eyebrow="error handling" title="Typed errors for every failure mode.">
        <p style={bodyStyle}>
          Every failure has its own class. <code>StrataRateLimitError</code> exposes
          the parsed reset time so you can decide your retry policy precisely.
        </p>
        <CodeBlock code={ERROR_HANDLING} lang="typescript" />
      </Section>

      {/* ── Footer ── */}
      <div style={{
        marginTop: 96, padding: '40px 0 0', borderTop: '1px solid var(--hair)',
        display: 'flex', flexDirection: 'column', gap: 16,
      }}>
        <p style={{
          fontFamily: 'var(--font-mono)', fontSize: 10.5, fontWeight: 600,
          letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--ink-faint)',
          margin: 0,
        }}>
          links
        </p>
        <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', fontSize: 14 }}>
          <a href="https://www.npmjs.com/package/@strata-ai/sdk" rel="noreferrer" style={{ color: 'var(--ink-soft)' }}>npm</a>
          <a href="https://github.com/PThrower/strata-sdk" rel="noreferrer" style={{ color: 'var(--ink-soft)' }}>GitHub</a>
          <a href="https://github.com/marketplace/actions/strata-mcp-security-check" rel="noreferrer" style={{ color: 'var(--ink-soft)' }}>Marketplace</a>
          <Link href="/docs" style={{ color: 'var(--ink-soft)' }}>All docs</Link>
          <Link href="/signup" style={{ color: 'var(--ink-soft)' }}>Get an API key</Link>
        </div>
      </div>
    </article>
  )
}
