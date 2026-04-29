import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'How It Works — Strata',
  description:
    'Every item in Strata passes through source collection, recency filtering, AI validation, and deduplication before reaching your agent.',
}

function CodeBlock({ children }: { children: string }) {
  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.10)',
        borderRadius: 10,
        padding: '12px 16px',
        fontFamily: 'var(--font-mono)',
        fontSize: 12,
        color: 'rgba(255,255,255,0.62)',
        lineHeight: 1.9,
        marginTop: 16,
        whiteSpace: 'pre',
      }}
    >
      {children}
    </div>
  )
}

export default function HowItWorksPage() {
  return (
    <div style={{ maxWidth: 672, margin: '0 auto', padding: '80px 0 80px' }}>

      {/* ── Header ── */}
      <p style={{
        fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500,
        letterSpacing: '0.20em', textTransform: 'uppercase', color: '#00c472',
        margin: '0 0 20px',
      }}>
        content integrity
      </p>
      <h1 style={{
        fontFamily: 'var(--font-serif)', fontSize: 36, fontWeight: 400,
        letterSpacing: '-0.02em', lineHeight: 1.15,
        color: 'var(--ink)', margin: '0 0 20px',
      }}>
        How Strata validates information.
      </h1>
      <p style={{
        fontSize: 16, color: 'var(--ink-muted)', lineHeight: 1.65,
        maxWidth: 512, margin: '0 0 72px',
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
              letterSpacing: '0.16em', textTransform: 'uppercase', color: '#00c472',
              whiteSpace: 'nowrap',
            }}>
              STEP 01
            </span>
            <div style={{ flex: 1, width: 1, background: 'rgba(255,255,255,0.10)', marginTop: 12 }} />
          </div>
          <div style={{ flex: 1, paddingBottom: 52, paddingLeft: 4 }}>
            <h3 style={{
              fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 400,
              color: 'var(--ink)', margin: '0 0 10px', letterSpacing: '-0.01em',
            }}>
              Source Collection
            </h3>
            <p style={{ fontSize: 14, color: 'var(--ink-muted)', lineHeight: 1.65, margin: 0 }}>
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
              letterSpacing: '0.16em', textTransform: 'uppercase', color: '#00c472',
              whiteSpace: 'nowrap',
            }}>
              STEP 02
            </span>
            <div style={{ flex: 1, width: 1, background: 'rgba(255,255,255,0.10)', marginTop: 12 }} />
          </div>
          <div style={{ flex: 1, paddingBottom: 52, paddingLeft: 4 }}>
            <h3 style={{
              fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 400,
              color: 'var(--ink)', margin: '0 0 10px', letterSpacing: '-0.01em',
            }}>
              Recency Filter
            </h3>
            <p style={{ fontSize: 14, color: 'var(--ink-muted)', lineHeight: 1.65, margin: 0 }}>
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
              letterSpacing: '0.16em', textTransform: 'uppercase', color: '#00c472',
              whiteSpace: 'nowrap',
            }}>
              STEP 03
            </span>
            <div style={{ flex: 1, width: 1, background: 'rgba(255,255,255,0.10)', marginTop: 12 }} />
          </div>
          <div style={{ flex: 1, paddingBottom: 52, paddingLeft: 4 }}>
            <h3 style={{
              fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 400,
              color: 'var(--ink)', margin: '0 0 10px', letterSpacing: '-0.01em',
            }}>
              Deduplication
            </h3>
            <p style={{ fontSize: 14, color: 'var(--ink-muted)', lineHeight: 1.65, margin: 0 }}>
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
              letterSpacing: '0.16em', textTransform: 'uppercase', color: '#00c472',
              whiteSpace: 'nowrap',
            }}>
              STEP 04
            </span>
            <div style={{ flex: 1, width: 1, background: 'rgba(255,255,255,0.10)', marginTop: 12 }} />
          </div>
          <div style={{ flex: 1, paddingBottom: 52, paddingLeft: 4 }}>
            <h3 style={{
              fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 400,
              color: 'var(--ink)', margin: '0 0 10px', letterSpacing: '-0.01em',
            }}>
              AI Validation
            </h3>
            <p style={{ fontSize: 14, color: 'var(--ink-muted)', lineHeight: 1.65, margin: 0 }}>
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
                <div
                  key={title}
                  style={{
                    border: '1px solid rgba(255,255,255,0.10)',
                    borderRadius: 12,
                    padding: 16,
                  }}
                >
                  <p style={{
                    fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600,
                    color: 'rgba(255,255,255,0.84)', margin: '0 0 7px', letterSpacing: '0.02em',
                  }}>
                    {title}
                  </p>
                  <p style={{ fontSize: 13, color: 'var(--ink-muted)', lineHeight: 1.6, margin: 0 }}>
                    {body}
                  </p>
                </div>
              ))}
            </div>

            {/* Confidence badges */}
            <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
              {[
                {
                  label: 'high confidence',
                  outcome: 'published automatically',
                  bg: 'rgba(0,196,114,0.09)',
                  border: 'rgba(0,196,114,0.55)',
                  text: '#00c472',
                },
                {
                  label: 'medium confidence',
                  outcome: 'flagged for review',
                  bg: 'rgba(245,158,11,0.09)',
                  border: 'rgba(245,158,11,0.50)',
                  text: '#f59e0b',
                },
                {
                  label: 'low confidence',
                  outcome: 'rejected',
                  bg: 'rgba(239,68,68,0.09)',
                  border: 'rgba(239,68,68,0.50)',
                  text: '#ef4444',
                },
              ].map(({ label, outcome, bg, border, text }) => (
                <div
                  key={label}
                  style={{
                    background: bg,
                    border: `1px solid ${border}`,
                    borderRadius: 8,
                    padding: '8px 14px',
                  }}
                >
                  <p style={{
                    fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700,
                    color: text, margin: '0 0 3px', letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                  }}>
                    {label}
                  </p>
                  <p style={{
                    fontFamily: 'var(--font-mono)', fontSize: 10.5, color: text,
                    margin: 0, opacity: 0.8,
                  }}>
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
              letterSpacing: '0.16em', textTransform: 'uppercase', color: '#00c472',
              whiteSpace: 'nowrap',
            }}>
              STEP 05
            </span>
            <div style={{ flex: 1, width: 1, background: 'rgba(255,255,255,0.10)', marginTop: 12 }} />
          </div>
          <div style={{ flex: 1, paddingBottom: 52, paddingLeft: 4 }}>
            <h3 style={{
              fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 400,
              color: 'var(--ink)', margin: '0 0 10px', letterSpacing: '-0.01em',
            }}>
              Near-Duplicate Removal
            </h3>
            <p style={{ fontSize: 14, color: 'var(--ink-muted)', lineHeight: 1.65, margin: 0 }}>
              After individual validation, surviving items are reviewed as a
              batch. When multiple items cover the same story from different
              sources, only the highest quality version is kept.
            </p>
            <CodeBlock>{`Input:  3 items covering the same SDK release\nOutput: 1 item — the most complete version retained`}</CodeBlock>
          </div>
        </div>

        {/* STEP 06 — Community Submissions (last step, no vertical line) */}
        <div style={{ display: 'flex', gap: 32 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600,
              letterSpacing: '0.16em', textTransform: 'uppercase', color: '#00c472',
              whiteSpace: 'nowrap',
            }}>
              STEP 06
            </span>
          </div>
          <div style={{ flex: 1, paddingBottom: 0, paddingLeft: 4 }}>
            <h3 style={{
              fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 400,
              color: 'var(--ink)', margin: '0 0 10px', letterSpacing: '-0.01em',
            }}>
              Community Submissions
            </h3>
            <p style={{ fontSize: 14, color: 'var(--ink-muted)', lineHeight: 1.65, margin: 0 }}>
              Developers can submit integrations, best practices, and tips
              directly. Every submission passes through the same AI validation
              pipeline before publication — high confidence submissions are
              published automatically, others are reviewed manually.
            </p>
          </div>
        </div>
      </div>

      {/* ── Closing ── */}
      <div style={{
        textAlign: 'center',
        paddingTop: 72,
        marginTop: 56,
        borderTop: '1px solid rgba(255,255,255,0.10)',
      }}>
        <h2 style={{
          fontFamily: 'var(--font-serif)', fontSize: 24, fontWeight: 400,
          color: 'var(--ink)', margin: '0 0 16px',
        }}>
          Not a firehose.
        </h2>
        <p style={{
          fontSize: 14, color: 'var(--ink-muted)', lineHeight: 1.65,
          maxWidth: 448, margin: '0 auto 24px',
        }}>
          On a typical day, Strata processes hundreds of items per ecosystem and
          publishes the top 20–30%. What reaches your agent has earned its place.
        </p>
        <Link href="/docs" className="community-cta-btn">
          See the API →
        </Link>
      </div>
    </div>
  )
}
