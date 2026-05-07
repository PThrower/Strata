import type { Metadata } from 'next'
import { Glass } from '@/components/ui/glass'
import { Btn } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'How It Works — Strata',
  description:
    'Four phases of trust infrastructure: MCP server security scoring, content intelligence, governance and policy enforcement, and runtime intelligence — circuit breakers, dependency graphs, and behavioral anomaly detection.',
}

function CodeBlock({ children }: { children: string }) {
  return (
    <Glass elevated={false} radius="sm" className="hiw-code-block" style={{ marginTop: 16 }}>
      <span style={{
        display: 'block',
        fontFamily: 'var(--font-mono)',
        fontSize: 12,
        color: 'var(--ink-muted)',
        lineHeight: 1.9,
        whiteSpace: 'pre',
        padding: '12px 16px',
      }}>
        {children}
      </span>
    </Glass>
  )
}

function StepLabel({ n }: { n: string }) {
  return (
    <span style={{
      fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600,
      letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--emerald-glow)',
      whiteSpace: 'nowrap',
    }}>
      {n}
    </span>
  )
}

function SectionHeading({ eyebrow, heading, subtext }: { eyebrow: string; heading: string; subtext: string }) {
  return (
    <div style={{ marginBottom: 48 }}>
      <p style={{
        fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500,
        letterSpacing: '0.20em', textTransform: 'uppercase', color: 'var(--emerald-glow)',
        margin: '0 0 18px',
      }}>
        {eyebrow}
      </p>
      <h2 className="hiw-section-h2" style={{
        fontFamily: 'var(--font-serif)', fontSize: 36, fontWeight: 400,
        letterSpacing: '-0.02em', lineHeight: 1.1,
        color: 'var(--ink)', margin: '0 0 14px',
      }}>
        {heading}
      </h2>
      <p style={{
        fontSize: 15, color: 'var(--ink-soft)', lineHeight: 1.65,
        maxWidth: 512, margin: 0,
      }}>
        {subtext}
      </p>
    </div>
  )
}

const hr: React.CSSProperties = {
  borderTop: '1px solid var(--hair)',
  paddingTop: 64,
  marginTop: 64,
}

export default function HowItWorksPage() {
  return (
    <article className="hiw-article" style={{ maxWidth: 672, margin: '0 auto', padding: '80px 0 64px' }}>

      {/* ── Page header ── */}
      <p style={{
        fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500,
        letterSpacing: '0.20em', textTransform: 'uppercase', color: 'var(--emerald-glow)',
        margin: '0 0 20px',
      }}>
        security · content · governance · runtime
      </p>
      <h1 style={{
        fontFamily: 'var(--font-serif)', fontSize: 48, fontWeight: 500,
        letterSpacing: '-0.025em', lineHeight: 1.08,
        color: 'var(--ink)', margin: '0 0 20px',
      }}>
        How Strata works.
      </h1>
      <p style={{
        fontSize: 16, color: 'var(--ink-soft)', lineHeight: 1.65,
        maxWidth: 512, margin: '0 0 64px',
      }}>
        Four phases of trust infrastructure: server scoring, content validation,
        the governance layer, and runtime intelligence that monitors your agents
        as they operate.
      </p>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* SECTION 1 — MCP Server Security Scoring                               */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <div className="hiw-section-hr" style={hr}>
        <SectionHeading
          eyebrow="Security Scoring"
          heading="How Strata scores 2,179 MCP servers."
          subtext="Every server in the directory passes through a six-stage security pipeline before it's trusted."
        />

        {/* STEP 01 */}
        <div style={{ display: 'flex', gap: 32 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
            <StepLabel n="STEP 01" />
            <div style={{ flex: 1, width: 1, background: 'var(--hair)', marginTop: 12 }} />
          </div>
          <div style={{ flex: 1, paddingBottom: 52, paddingLeft: 4, minWidth: 0, wordBreak: 'break-word' }}>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 400, color: 'var(--ink)', margin: '0 0 10px', letterSpacing: '-0.01em' }}>
              Source Collection
            </h3>
            <p style={{ fontSize: 15, color: 'var(--ink-soft)', lineHeight: 1.7, margin: 0 }}>
              Strata crawls 22 AI ecosystems continuously — GitHub repositories, npm packages,
              official ecosystem directories, and community submissions. Every MCP server reference
              is captured regardless of popularity.
            </p>
          </div>
        </div>

        {/* STEP 02 */}
        <div style={{ display: 'flex', gap: 32 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
            <StepLabel n="STEP 02" />
            <div style={{ flex: 1, width: 1, background: 'var(--hair)', marginTop: 12 }} />
          </div>
          <div style={{ flex: 1, paddingBottom: 52, paddingLeft: 4, minWidth: 0, wordBreak: 'break-word' }}>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 400, color: 'var(--ink)', margin: '0 0 10px', letterSpacing: '-0.01em' }}>
              Static Analysis
            </h3>
            <p style={{ fontSize: 15, color: 'var(--ink-soft)', lineHeight: 1.7, margin: 0 }}>
              Source code, README files, and manifests are analyzed for capability signals.
              Seven capability flags are extracted. The security_score (0–100) is computed from
              GitHub health signals: stars, commit recency, release history, license, archived status.
            </p>
            <CodeBlock>{`shell_exec    → can spawn shell processes\ndynamic_eval  → can execute arbitrary code\nfs_write      → can write to the filesystem\narbitrary_sql → can run raw SQL queries\nnet_egress    → makes outbound network requests\nsecret_read   → reads environment variables or credentials\nprocess_spawn → spawns child processes`}</CodeBlock>
          </div>
        </div>

        {/* STEP 03 */}
        <div style={{ display: 'flex', gap: 32 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
            <StepLabel n="STEP 03" />
            <div style={{ flex: 1, width: 1, background: 'var(--hair)', marginTop: 12 }} />
          </div>
          <div style={{ flex: 1, paddingBottom: 52, paddingLeft: 4, minWidth: 0, wordBreak: 'break-word' }}>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 400, color: 'var(--ink)', margin: '0 0 10px', letterSpacing: '-0.01em' }}>
              Injection Scanning
            </h3>
            <p style={{ fontSize: 15, color: 'var(--ink-soft)', lineHeight: 1.7, margin: 0 }}>
              Every tool description in every server is scanned for prompt injection — hidden
              instructions designed to manipulate agent behavior. Three layers run in sequence.
              A score of 6/10 or above quarantines the server permanently.
            </p>
            <CodeBlock>{`Layer 1  Regex patterns for known injection signatures\nLayer 2  Claude Haiku semantic analysis\nLayer 3  Claude Sonnet extended thinking for borderline cases\n\nScore ≥ 6/10 → quarantined, never surfaces in results`}</CodeBlock>
          </div>
        </div>

        {/* STEP 04 */}
        <div style={{ display: 'flex', gap: 32 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
            <StepLabel n="STEP 04" />
            <div style={{ flex: 1, width: 1, background: 'var(--hair)', marginTop: 12 }} />
          </div>
          <div style={{ flex: 1, paddingBottom: 52, paddingLeft: 4, minWidth: 0, wordBreak: 'break-word' }}>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 400, color: 'var(--ink)', margin: '0 0 10px', letterSpacing: '-0.01em' }}>
              Live Endpoint Probing
            </h3>
            <p style={{ fontSize: 15, color: 'var(--ink-soft)', lineHeight: 1.7, margin: 0 }}>
              For servers with hosted endpoints, Strata sends a real MCP initialize handshake and
              tools/list request. This confirms the server is actually running, detects drift between
              declared and observed tools, and feeds latency and schema validation data into the
              runtime_score.
            </p>
          </div>
        </div>

        {/* STEP 05 */}
        <div style={{ display: 'flex', gap: 32 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
            <StepLabel n="STEP 05" />
            <div style={{ flex: 1, width: 1, background: 'var(--hair)', marginTop: 12 }} />
          </div>
          <div style={{ flex: 1, paddingBottom: 52, paddingLeft: 4, minWidth: 0, wordBreak: 'break-word' }}>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 400, color: 'var(--ink)', margin: '0 0 10px', letterSpacing: '-0.01em' }}>
              Per-Tool Scoring
            </h3>
            <p style={{ fontSize: 15, color: 'var(--ink-soft)', lineHeight: 1.7, margin: 0 }}>
              Individual tools within each server are scored separately. A server where 1 of 12 tools
              has shell_exec gets different treatment than one where every tool is dangerous.
              dangerousToolCount is tracked and exposed in the API alongside the server-level scores.
            </p>
          </div>
        </div>

        {/* STEP 06 — last, no connector */}
        <div style={{ display: 'flex', gap: 32 }}>
          <div style={{ flexShrink: 0 }}>
            <StepLabel n="STEP 06" />
          </div>
          <div style={{ flex: 1, paddingLeft: 4, minWidth: 0, wordBreak: 'break-word' }}>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 400, color: 'var(--ink)', margin: '0 0 10px', letterSpacing: '-0.01em' }}>
              Published to Directory
            </h3>
            <p style={{ fontSize: 15, color: 'var(--ink-soft)', lineHeight: 1.7, margin: 0 }}>
              The final scores are published. Servers are searchable by risk level, capability flags,
              ecosystem, and use case via the REST API and native MCP server.
            </p>
            <CodeBlock>{`security_score   → repo health (0–100)\nruntime_score    → behavioral trust (0–100)\ncapability_flags → what tools can actually do\nis_quarantined   → injection or malicious content detected`}</CodeBlock>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* SECTION 2 — Content Intelligence Pipeline                             */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <div className="hiw-section-hr" style={hr}>
        <SectionHeading
          eyebrow="Content Intelligence"
          heading="How Strata validates ecosystem information."
          subtext="Best practices, news, and integrations pass through a separate validation pipeline before reaching your agent."
        />

        {/* STEP 01 */}
        <div style={{ display: 'flex', gap: 32 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
            <StepLabel n="STEP 01" />
            <div style={{ flex: 1, width: 1, background: 'var(--hair)', marginTop: 12 }} />
          </div>
          <div style={{ flex: 1, paddingBottom: 52, paddingLeft: 4, minWidth: 0, wordBreak: 'break-word' }}>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 400, color: 'var(--ink)', margin: '0 0 10px', letterSpacing: '-0.01em' }}>
              Source Collection
            </h3>
            <p style={{ fontSize: 15, color: 'var(--ink-soft)', lineHeight: 1.7, margin: 0 }}>
              Strata monitors four types of sources per ecosystem, continuously pulling content
              from across the AI developer community.
            </p>
            <CodeBlock>{`RSS feeds    → official blogs and changelogs\nReddit       → community posts (score ≥ 10 only)\nGitHub       → official release notes and changelogs\nCommunity    → developer submissions`}</CodeBlock>
          </div>
        </div>

        {/* STEP 02 */}
        <div style={{ display: 'flex', gap: 32 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
            <StepLabel n="STEP 02" />
            <div style={{ flex: 1, width: 1, background: 'var(--hair)', marginTop: 12 }} />
          </div>
          <div style={{ flex: 1, paddingBottom: 52, paddingLeft: 4, minWidth: 0, wordBreak: 'break-word' }}>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 400, color: 'var(--ink)', margin: '0 0 10px', letterSpacing: '-0.01em' }}>
              Recency Filter
            </h3>
            <p style={{ fontSize: 15, color: 'var(--ink-soft)', lineHeight: 1.7, margin: 0 }}>
              Items older than 7 days are discarded immediately. GitHub releases are limited to the
              5 most recent per repo. Only fresh content proceeds.
            </p>
          </div>
        </div>

        {/* STEP 03 */}
        <div style={{ display: 'flex', gap: 32 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
            <StepLabel n="STEP 03" />
            <div style={{ flex: 1, width: 1, background: 'var(--hair)', marginTop: 12 }} />
          </div>
          <div style={{ flex: 1, paddingBottom: 52, paddingLeft: 4, minWidth: 0, wordBreak: 'break-word' }}>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 400, color: 'var(--ink)', margin: '0 0 10px', letterSpacing: '-0.01em' }}>
              Deduplication
            </h3>
            <p style={{ fontSize: 15, color: 'var(--ink-soft)', lineHeight: 1.7, margin: 0 }}>
              Each item is checked against all previously seen source URLs. Already-seen items
              are discarded instantly — no redundant processing, no repeated content.
            </p>
            <CodeBlock>{`If source_url exists in database → discard\nIf source_url is new             → continue to validation`}</CodeBlock>
          </div>
        </div>

        {/* STEP 04 */}
        <div style={{ display: 'flex', gap: 32 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
            <StepLabel n="STEP 04" />
            <div style={{ flex: 1, width: 1, background: 'var(--hair)', marginTop: 12 }} />
          </div>
          <div style={{ flex: 1, paddingBottom: 52, paddingLeft: 4, minWidth: 0, wordBreak: 'break-word' }}>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 400, color: 'var(--ink)', margin: '0 0 10px', letterSpacing: '-0.01em' }}>
              AI Validation
            </h3>
            <p style={{ fontSize: 15, color: 'var(--ink-soft)', lineHeight: 1.7, margin: 0 }}>
              Each surviving item is evaluated against four criteria. Items that fail any
              criterion are rejected.
            </p>

            <div className="hiw-inner-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 16 }}>
              {[
                { title: 'Ecosystem relevance', body: 'Directly relevant to developers using this ecosystem — not passing mentions or tangential content.' },
                { title: 'Accuracy',             body: 'Not misleading, outdated, or contradicted by official sources.' },
                { title: 'Developer utility',   body: 'Useful to someone building a production AI application — not consumer-facing or promotional.' },
                { title: 'Substance',            body: 'Sufficient detail to be actionable — not one-line posts or link-only content.' },
              ].map(({ title, body }) => (
                <Glass key={title} shimmer radius="sm" style={{ padding: 16 }}>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, color: 'var(--ink)', margin: '0 0 7px', letterSpacing: '0.02em' }}>{title}</p>
                  <p style={{ fontSize: 13, color: 'var(--ink-muted)', lineHeight: 1.6, margin: 0 }}>{body}</p>
                </Glass>
              ))}
            </div>

            <div className="hiw-inner-3col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: 14 }}>
              {[
                { label: 'High confidence', outcome: 'published automatically', bg: 'linear-gradient(135deg, rgba(255,255,255,0.13) 0%, rgba(255,255,255,0.06) 35%, rgba(95,176,133,0.09) 70%, rgba(95,176,133,0.17) 100%)', text: 'var(--emerald-glow)' },
                { label: 'Medium confidence', outcome: 'flagged for review',     bg: 'linear-gradient(135deg, rgba(255,255,255,0.13) 0%, rgba(255,255,255,0.06) 35%, rgba(245,158,11,0.09) 70%, rgba(245,158,11,0.17) 100%)', text: '#f59e0b' },
                { label: 'Low confidence',    outcome: 'rejected',               bg: 'linear-gradient(135deg, rgba(255,255,255,0.13) 0%, rgba(255,255,255,0.06) 35%, rgba(239,68,68,0.09) 70%, rgba(239,68,68,0.17) 100%)',   text: '#ef4444' },
              ].map(({ label, outcome, bg, text }) => (
                <Glass key={label} shimmer radius="sm" style={{ padding: '18px 20px', background: bg }}>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: text, margin: '0 0 8px', letterSpacing: '0.04em' }}>{label}</p>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: text, margin: 0, opacity: 0.75 }}>{outcome}</p>
                </Glass>
              ))}
            </div>
          </div>
        </div>

        {/* STEP 05 */}
        <div style={{ display: 'flex', gap: 32 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
            <StepLabel n="STEP 05" />
            <div style={{ flex: 1, width: 1, background: 'var(--hair)', marginTop: 12 }} />
          </div>
          <div style={{ flex: 1, paddingBottom: 52, paddingLeft: 4, minWidth: 0, wordBreak: 'break-word' }}>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 400, color: 'var(--ink)', margin: '0 0 10px', letterSpacing: '-0.01em' }}>
              Near-Duplicate Removal
            </h3>
            <p style={{ fontSize: 15, color: 'var(--ink-soft)', lineHeight: 1.7, margin: 0 }}>
              After individual validation, surviving items are reviewed as a batch. When multiple
              items cover the same story, only the highest-quality version is kept.
            </p>
            <CodeBlock>{`Input:  3 items covering the same SDK release\nOutput: 1 item — the most complete version retained`}</CodeBlock>
          </div>
        </div>

        {/* STEP 06 — last, no connector */}
        <div style={{ display: 'flex', gap: 32 }}>
          <div style={{ flexShrink: 0 }}>
            <StepLabel n="STEP 06" />
          </div>
          <div style={{ flex: 1, paddingLeft: 4, minWidth: 0, wordBreak: 'break-word' }}>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 400, color: 'var(--ink)', margin: '0 0 10px', letterSpacing: '-0.01em' }}>
              Community Submissions
            </h3>
            <p style={{ fontSize: 15, color: 'var(--ink-soft)', lineHeight: 1.7, margin: 0 }}>
              Developers can submit integrations, best practices, and tips directly. Every
              submission passes through the same AI validation pipeline — high-confidence items
              publish automatically, others are reviewed manually.
            </p>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* SECTION 3 — Governance Layer                                          */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <div className="hiw-section-hr" style={hr}>
        <SectionHeading
          eyebrow="Phase 3 — Live"
          heading="Policy, compliance, and threat monitoring."
          subtext="Beyond scoring — Strata enforces rules, generates tamper-evident audit evidence, and alerts you when connected servers change risk profile."
        />

        {[
          {
            label: 'Policy Engine',
            body: 'Define rules that govern what your agents are allowed to do. "No shell_exec in production." Enforced at the Strata layer before any tool call executes.',
          },
          {
            label: 'Compliance Reporting',
            body: 'One-click SOC 2 and ISO 27001 audit evidence packages generated from the Agent Activity Ledger. Tamper-evident with HMAC signature verification.',
          },
          {
            label: 'Real-Time Threat Feed',
            body: 'A Postgres trigger fires when servers change risk profile — quarantine added, dangerous capabilities gained, security score drops. Push alerts before your agents are affected.',
          },
        ].map(({ label, body }) => (
          <Glass key={label} shimmer style={{ padding: '24px 28px', marginBottom: 10 }}>
            <p style={{
              fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600,
              letterSpacing: '0.10em', textTransform: 'uppercase',
              color: 'var(--emerald-glow)', margin: '0 0 10px',
            }}>
              {label}
            </p>
            <p style={{ fontSize: 15, color: 'var(--ink-soft)', lineHeight: 1.65, margin: 0 }}>
              {body}
            </p>
          </Glass>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* SECTION 4 — Runtime Intelligence (Phase 4)                            */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <div className="hiw-section-hr" style={hr}>
        <SectionHeading
          eyebrow="Phase 4 — Live"
          heading="Runtime intelligence."
          subtext="Beyond static scoring — Strata monitors your agents in real time, maps your dependencies, and breaks circuits before damage occurs."
        />

        {[
          {
            label: 'Circuit Breaker & Rollback',
            body: 'When a connected server crosses a critical risk threshold — quarantined, injection detected, score collapse — Strata automatically trips a circuit breaker. Agents continue in degraded-safe mode. No human intervention required. Per-profile bypass available for reviewed exceptions.',
          },
          {
            label: 'MCP Server Dependency Graph',
            body: 'Visual map of every MCP server your agents depend on. Risk scores, capability flags, circuit breaker status, and data lineage flows in one view. Nodes sorted by risk — critical servers surface first. Enriched with live threat feed data and policy status.',
          },
          {
            label: 'Behavioral Anomaly Detection',
            body: '30-day rolling baselines per agent. Three detectors: volume spikes (5× baseline), high-risk server surges (3× baseline), net-egress floods (3× baseline, escalates to critical off-hours). Hourly analysis. 6-hour dedup window. Requires 7 days history and 50 calls minimum — no false positives on new accounts.',
          },
        ].map(({ label, body }) => (
          <Glass key={label} shimmer style={{ padding: '24px 28px', marginBottom: 10 }}>
            <p style={{
              fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600,
              letterSpacing: '0.10em', textTransform: 'uppercase',
              color: 'var(--emerald-glow)', margin: '0 0 10px',
            }}>
              {label}
            </p>
            <p style={{ fontSize: 15, color: 'var(--ink-soft)', lineHeight: 1.65, margin: 0 }}>
              {body}
            </p>
          </Glass>
        ))}
      </div>

      {/* ── Closing ── */}
      <Glass shimmer style={{ padding: '52px 48px', marginTop: 64, textAlign: 'center' }}>
        <div>
          <h2 style={{
            fontFamily: 'var(--font-serif)', fontSize: 36, fontWeight: 400,
            letterSpacing: '-0.02em', lineHeight: 1.1,
            color: 'var(--ink)', margin: '0 0 16px',
          }}>
            Not a firehose.
          </h2>
          <p style={{
            fontSize: 15, color: 'var(--ink-soft)', lineHeight: 1.65,
            maxWidth: 448, margin: '0 auto 32px',
          }}>
            On a typical day, Strata processes hundreds of items per ecosystem and
            publishes the top 20–30%. 2,179 MCP servers scored across 22 ecosystems.
            What reaches your agent has earned its place.
          </p>
          <Btn variant="ghost" href="/docs" arrow={false}>
            See the API →
          </Btn>
        </div>
      </Glass>
    </article>
  )
}
