import type { Metadata } from 'next'
import { Glass } from '@/components/ui/glass'
import { Btn } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'How It Works — Strata',
  description:
    'Every item in Strata passes through source collection, recency filtering, AI validation, and deduplication before reaching your agent.',
}

function CodeBlock({ children }: { children: string }) {
  return (
    <Glass elevated={false} radius="sm" style={{ marginTop: 16 }}>
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

export default function HowItWorksPage() {
  return (
    <article style={{ maxWidth: 672, margin: '0 auto', padding: '80px 0 64px' }}>

      {/* ── Header ── */}
      <p style={{
        fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500,
        letterSpacing: '0.20em', textTransform: 'uppercase', color: 'var(--emerald-glow)',
        margin: '0 0 20px',
      }}>
        content integrity
      </p>
      <h1 style={{
        fontFamily: 'var(--font-serif)', fontSize: 48, fontWeight: 500,
        letterSpacing: '-0.025em', lineHeight: 1.08,
        color: 'var(--ink)', margin: '0 0 20px',
      }}>
        How Strata validates information.
      </h1>
      <p style={{
        fontSize: 16, color: 'var(--ink-soft)', lineHeight: 1.65,
        maxWidth: 512, margin: '0 0 64px',
      }}>
        Every item in Strata passes through a multi-stage pipeline before it
        reaches your agent. Here&apos;s exactly how it works.
      </p>

      {/* ── Timeline ── */}
      <div>

        {/* STEP 01 — Source Collection */}
        <div style={{ display: 'flex', gap: 32 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600,
              letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--emerald-glow)',
              whiteSpace: 'nowrap',
            }}>
              STEP 01
            </span>
            <div style={{ flex: 1, width: 1, background: 'var(--hair)', marginTop: 12 }} />
          </div>
          <div style={{ flex: 1, paddingBottom: 52, paddingLeft: 4 }}>
            <h3 style={{
              fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 400,
              color: 'var(--ink)', margin: '0 0 10px', letterSpacing: '-0.01em',
            }}>
              Source Collection
            </h3>
            <p style={{ fontSize: 15, color: 'var(--ink-soft)', lineHeight: 1.7, margin: 0 }}>
              Strata monitors four types of sources per ecosystem, continuously
              pulling content from across the AI developer community.
            </p>
            <CodeBlock>{`RSS feeds    → official blogs and changelogs\nReddit       → community posts (score ≥ 10 only)\nGitHub       → official release notes and changelogs\nCommunity    → developer submissions`}</CodeBlock>
          </div>
        </div>

        {/* STEP 02 — Recency Filter */}
        <div style={{ display: 'flex', gap: 32 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600,
              letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--emerald-glow)',
              whiteSpace: 'nowrap',
            }}>
              STEP 02
            </span>
            <div style={{ flex: 1, width: 1, background: 'var(--hair)', marginTop: 12 }} />
          </div>
          <div style={{ flex: 1, paddingBottom: 52, paddingLeft: 4 }}>
            <h3 style={{
              fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 400,
              color: 'var(--ink)', margin: '0 0 10px', letterSpacing: '-0.01em',
            }}>
              Recency Filter
            </h3>
            <p style={{ fontSize: 15, color: 'var(--ink-soft)', lineHeight: 1.7, margin: 0 }}>
              Items older than 7 days are discarded immediately. GitHub releases
              are limited to the 5 most recent per repository. Reddit posts are
              pulled from /new to catch the freshest content.
            </p>
          </div>
        </div>

        {/* STEP 03 — Deduplication */}
        <div style={{ display: 'flex', gap: 32 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600,
              letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--emerald-glow)',
              whiteSpace: 'nowrap',
            }}>
              STEP 03
            </span>
            <div style={{ flex: 1, width: 1, background: 'var(--hair)', marginTop: 12 }} />
          </div>
          <div style={{ flex: 1, paddingBottom: 52, paddingLeft: 4 }}>
            <h3 style={{
              fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 400,
              color: 'var(--ink)', margin: '0 0 10px', letterSpacing: '-0.01em',
            }}>
              Deduplication
            </h3>
            <p style={{ fontSize: 15, color: 'var(--ink-soft)', lineHeight: 1.7, margin: 0 }}>
              Before any content reaches validation, Strata checks each item
              against its database of previously seen source URLs. Items already
              in the system are discarded instantly — no redundant processing,
              no repeated content.
            </p>
            <CodeBlock>{`If source_url exists in database → discard\nIf source_url is new             → continue to validation`}</CodeBlock>
          </div>
        </div>

        {/* STEP 04 — AI Validation */}
        <div style={{ display: 'flex', gap: 32 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600,
              letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--emerald-glow)',
              whiteSpace: 'nowrap',
            }}>
              STEP 04
            </span>
            <div style={{ flex: 1, width: 1, background: 'var(--hair)', marginTop: 12 }} />
          </div>
          <div style={{ flex: 1, paddingBottom: 52, paddingLeft: 4 }}>
            <h3 style={{
              fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 400,
              color: 'var(--ink)', margin: '0 0 10px', letterSpacing: '-0.01em',
            }}>
              AI Validation
            </h3>
            <p style={{ fontSize: 15, color: 'var(--ink-soft)', lineHeight: 1.7, margin: 0 }}>
              Each surviving item is evaluated against four criteria. Items that
              fail any criterion are rejected.
            </p>

            {/* 2×2 criteria grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 10,
              marginTop: 16,
            }}>
              {[
                {
                  title: 'Ecosystem relevance',
                  body: 'Directly relevant to developers using this ecosystem — not passing mentions or tangential content.',
                },
                {
                  title: 'Accuracy',
                  body: 'Not misleading, outdated, or contradicted by official sources.',
                },
                {
                  title: 'Developer utility',
                  body: 'Useful to someone building a production AI application — not consumer-facing or promotional.',
                },
                {
                  title: 'Substance',
                  body: 'Sufficient detail to be actionable — not one-line posts or link-only content.',
                },
              ].map(({ title, body }) => (
                <Glass key={title} shimmer radius="sm" style={{ padding: 16 }}>
                  <p style={{
                    fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600,
                    color: 'var(--ink)', margin: '0 0 7px', letterSpacing: '0.02em',
                  }}>
                    {title}
                  </p>
                  <p style={{ fontSize: 13, color: 'var(--ink-muted)', lineHeight: 1.6, margin: 0 }}>
                    {body}
                  </p>
                </Glass>
              ))}
            </div>

            {/* Confidence badges */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: 14 }}>
              {[
                {
                  label: 'high confidence',
                  outcome: 'published automatically',
                  bg: 'rgba(95,176,133,0.09)',
                  border: 'rgba(95,176,133,0.45)',
                  text: 'var(--emerald-glow)',
                },
                {
                  label: 'medium confidence',
                  outcome: 'flagged for review',
                  bg: 'rgba(245,158,11,0.09)',
                  border: 'rgba(245,158,11,0.45)',
                  text: '#f59e0b',
                },
                {
                  label: 'low confidence',
                  outcome: 'rejected',
                  bg: 'rgba(239,68,68,0.09)',
                  border: 'rgba(239,68,68,0.45)',
                  text: '#ef4444',
                },
              ].map(({ label, outcome, bg, border, text }) => (
                <div
                  key={label}
                  style={{ background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: '18px 20px' }}
                >
                  <p style={{
                    fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700,
                    color: text, margin: '0 0 8px', letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                  }}>
                    {label}
                  </p>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: text, margin: 0, opacity: 0.75 }}>
                    {outcome}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* STEP 05 — Near-Duplicate Removal */}
        <div style={{ display: 'flex', gap: 32 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600,
              letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--emerald-glow)',
              whiteSpace: 'nowrap',
            }}>
              STEP 05
            </span>
            <div style={{ flex: 1, width: 1, background: 'var(--hair)', marginTop: 12 }} />
          </div>
          <div style={{ flex: 1, paddingBottom: 52, paddingLeft: 4 }}>
            <h3 style={{
              fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 400,
              color: 'var(--ink)', margin: '0 0 10px', letterSpacing: '-0.01em',
            }}>
              Near-Duplicate Removal
            </h3>
            <p style={{ fontSize: 15, color: 'var(--ink-soft)', lineHeight: 1.7, margin: 0 }}>
              After individual validation, surviving items are reviewed as a
              batch. When multiple items cover the same story from different
              sources, only the highest quality version is kept.
            </p>
            <CodeBlock>{`Input:  3 items covering the same SDK release\nOutput: 1 item — the most complete version retained`}</CodeBlock>
          </div>
        </div>

        {/* STEP 06 — Community Submissions (last step, no vertical line) */}
        <div style={{ display: 'flex', gap: 32 }}>
          <div style={{ flexShrink: 0 }}>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600,
              letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--emerald-glow)',
              whiteSpace: 'nowrap', display: 'block',
            }}>
              STEP 06
            </span>
          </div>
          <div style={{ flex: 1, paddingLeft: 4 }}>
            <h3 style={{
              fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 400,
              color: 'var(--ink)', margin: '0 0 10px', letterSpacing: '-0.01em',
            }}>
              Community Submissions
            </h3>
            <p style={{ fontSize: 15, color: 'var(--ink-soft)', lineHeight: 1.7, margin: 0 }}>
              Developers can submit integrations, best practices, and tips
              directly. Every submission passes through the same AI validation
              pipeline before publication — high confidence submissions are
              published automatically, others are reviewed manually.
            </p>
          </div>
        </div>
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
            publishes the top 20–30%. What reaches your agent has earned its place.
          </p>
          <Btn variant="ghost" href="/docs" arrow={false}>
            See the API →
          </Btn>
        </div>
      </Glass>
    </article>
  )
}
