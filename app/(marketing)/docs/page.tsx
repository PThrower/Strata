import type { Metadata } from 'next'
import Link from 'next/link'
import { Glass } from '@/components/ui/glass'

export const metadata: Metadata = {
  title: 'Docs — Strata',
  description: 'Documentation for the Strata SDK, REST API, MCP server, and GitHub Action.',
}

interface DocLinkProps {
  href: string
  eyebrow: string
  title: string
  description: string
  meta: string
}

function DocCard({ href, eyebrow, title, description, meta }: DocLinkProps) {
  return (
    <Link href={href} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
      <Glass shimmer style={{ padding: '28px 32px', cursor: 'pointer' }}>
        <p style={{
          fontFamily: 'var(--font-mono)', fontSize: 10.5, fontWeight: 600,
          letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--emerald-glow)',
          margin: '0 0 12px',
        }}>
          {eyebrow}
        </p>
        <h3 style={{
          fontFamily: 'var(--font-serif)', fontSize: 24, fontWeight: 400,
          color: 'var(--ink)', margin: '0 0 10px', letterSpacing: '-0.015em',
        }}>
          {title}
        </h3>
        <p style={{ fontSize: 14, color: 'var(--ink-soft)', lineHeight: 1.65, margin: '0 0 16px' }}>
          {description}
        </p>
        <p style={{
          fontFamily: 'var(--font-mono)', fontSize: 10.5, fontWeight: 500,
          letterSpacing: '0.14em', color: 'var(--ink-faint)', margin: 0,
        }}>
          {meta}
        </p>
      </Glass>
    </Link>
  )
}

export default function DocsIndexPage() {
  return (
    <article style={{ maxWidth: 920, margin: '0 auto', padding: '80px 0 64px' }}>

      <p style={{
        fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500,
        letterSpacing: '0.20em', textTransform: 'uppercase', color: 'var(--emerald-glow)',
        margin: '0 0 20px',
      }}>
        documentation
      </p>
      <h1 style={{
        fontFamily: 'var(--font-serif)', fontSize: 56, fontWeight: 500,
        letterSpacing: '-0.025em', lineHeight: 1.04,
        color: 'var(--ink)', margin: '0 0 20px',
      }}>
        Build with Strata.
      </h1>
      <p style={{
        fontSize: 17, color: 'var(--ink-soft)', lineHeight: 1.6,
        maxWidth: 612, margin: '0 0 56px',
      }}>
        Verify any MCP server in one line of code, gate every PR on supply-chain
        safety, or pull intelligence briefs into your agent. Pick a surface to start.
      </p>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20,
      }}>
        <DocCard
          href="/docs/sdk"
          eyebrow="typescript"
          title="SDK"
          description="Zero-dependency npm package. verify, verifyAll, findMCP, ecosystem, plus a strata CLI with verify and scan."
          meta="@strata-ai/sdk →"
        />
        <DocCard
          href="/docs/sdk#github-action"
          eyebrow="ci/cd"
          title="GitHub Action"
          description="One workflow file gates every PR on MCP supply-chain safety. Posts an idempotent trust report comment."
          meta="strata-mcp-check →"
        />
        <DocCard
          href="/how-it-works"
          eyebrow="rest api"
          title="REST API"
          description="HTTP endpoints for best practices, news, integrations, MCP search, and ecosystem briefs."
          meta="api/v1/* →"
        />
        <DocCard
          href="/how-it-works"
          eyebrow="protocol"
          title="MCP Server"
          description="Drop-in MCP server for Claude Desktop, Cursor, Cline. Six tools, three prompt templates, one resource."
          meta="usestrata.dev/mcp →"
        />
      </div>

      <div style={{
        marginTop: 80, padding: '40px 0 0', borderTop: '1px solid var(--hair)',
        display: 'flex', flexDirection: 'column', gap: 16,
      }}>
        <p style={{
          fontFamily: 'var(--font-mono)', fontSize: 10.5, fontWeight: 600,
          letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--ink-faint)',
          margin: 0,
        }}>
          related
        </p>
        <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', fontSize: 14 }}>
          <Link href="/how-it-works" style={{ color: 'var(--ink-soft)' }}>How Strata validates content</Link>
          <Link href="/submit-mcp" style={{ color: 'var(--ink-soft)' }}>Submit an MCP server</Link>
          <Link href="/#pricing" style={{ color: 'var(--ink-soft)' }}>Pricing</Link>
          <a href="https://github.com/PThrower/strata-sdk" style={{ color: 'var(--ink-soft)' }} rel="noreferrer">GitHub repo</a>
          <a href="https://www.npmjs.com/package/@strata-ai/sdk" style={{ color: 'var(--ink-soft)' }} rel="noreferrer">npm package</a>
        </div>
      </div>
    </article>
  )
}
