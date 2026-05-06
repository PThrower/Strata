'use client'

import { useEffect, useRef, useState } from 'react'

type LineKind = 'plain' | 'success' | 'warning' | 'critical'

interface TabDef {
  label: string
  prompt: '$' | '>'
  command: string
  output: string[]
}

const COLOR: Record<LineKind, string> = {
  plain:    '#e6edf3',
  success:  '#00c472',
  warning:  '#f59e0b',
  critical: '#ef4444',
}

function lineKind(text: string): LineKind {
  const t = text.trimStart()
  if (t.startsWith('✓')) return 'success'
  if (t.startsWith('⚠')) return 'warning'
  if (t.startsWith('✗')) return 'critical'
  return 'plain'
}

const TABS: TabDef[] = [
  {
    label: 'Scan config',
    prompt: '$',
    command: 'npx @strata-ai/sdk scan',
    output: [
      '  Scanning claude_desktop_config.json...',
      '  4 MCP servers',
      '',
      '  ✓ @modelcontextprotocol/server-filesystem',
      '    risk: low  |  security: 85  |  runtime: 72',
      '    flags: fs_write, net_egress',
      '',
      '  ✓ @playwright/mcp',
      '    risk: low  |  security: 91  |  runtime: 68',
      '    flags: net_egress',
      '',
      '  ⚠ owner/unknown-server',
      '    risk: high  |  security: 44  |  runtime: 31',
      '    flags: shell_exec, dynamic_eval',
      '    dangerous tools: 2 of 8',
      '',
      '  ✗ sketchy-org/mcp-tool',
      '    risk: critical  |  security: 8  |  quarantined',
      '    flags: shell_exec, dynamic_eval, secret_read',
      '',
      '  Summary: 2 safe · 1 high risk · 1 critical',
      '  Run with --fail-on high to block unsafe servers',
    ],
  },
  {
    label: 'Verify server',
    prompt: '$',
    command: 'npx @strata-ai/sdk verify github.com/microsoft/playwright-mcp',
    output: [
      '  Looking up github.com/microsoft/playwright-mcp...',
      '  Found in Strata directory',
      '',
      '  Name:           Playwright MCP',
      '  Risk:           low',
      '  Security score: 91 / 100',
      '  Runtime score:  68 / 100',
      '  Flags:          net_egress',
      '  Trusted:        yes',
      '',
      '  ✓ Safe to connect.',
    ],
  },
  {
    label: 'x402 payment',
    prompt: '$',
    command: 'npx @strata-ai/sdk verify-payment https://api.example.com/premium',
    output: [
      '  Checking https://api.example.com/premium...',
      '',
      '  Protocol:       x402 ✓',
      '  SSL:            valid',
      '  Domain age:     847 days',
      '  Amount:         $0.05 per request',
      '  Risk:           low',
      '  Score:          78 / 100',
      '  Flags:          unverified_domain',
      '',
      '  ✓ Safe to pay. Amount is reasonable.',
    ],
  },
  {
    label: 'Agent identity',
    prompt: '>',
    command: 'create an agent identity for my production bot',
    output: [
      '  Creating agent identity...',
      '',
      '  Name:           production-bot',
      '  Agent ID:       agt_a1b2c3d4e5f6...',
      '  Capabilities:   mcp:invoke, x402:pay',
      '  Expires:        2027-05-06',
      '',
      '  ✓ Ed25519 credential issued.',
      '',
      '  Present as: Authorization: Bearer eyJhbGc...',
      '',
      '  ⚠ Copy this credential now. It will not be shown again.',
    ],
  },
  {
    label: 'Policy engine',
    prompt: '>',
    command: 'block all servers with shell_exec in production',
    output: [
      '  Creating policy...',
      '',
      '  Name:     No shell execution',
      '  Action:   block',
      '  Trigger:  capability_flags contains shell_exec',
      '  Scope:    all agents',
      '',
      '  ✓ Policy active. Enforced before every tool call.',
      '',
      '  Test: verifying github.com/owner/shell-server...',
      '  → Policy blocked: "No shell execution" matched shell_exec flag',
      '  → Returned 403 before tool executed.',
    ],
  },
  {
    label: 'Ask via MCP',
    prompt: '>',
    command: 'find me safe MCP servers for browser automation',
    output: [
      '  Querying Strata directory...',
      '',
      '  Found 3 verified servers for browser automation:',
      '',
      '  1. Playwright MCP — risk: low (91/68)',
      '     github.com/microsoft/playwright-mcp',
      '',
      '  2. Puppeteer MCP — risk: low (78/61)',
      '     github.com/puppeteer/puppeteer-mcp',
      '',
      '  3. Browser-use MCP — risk: medium (65/44)',
      '     ⚠ has net_egress — review before connecting',
      '',
      '  To add Strata to Claude Code:',
      '  claude mcp add strata --transport http \\',
      '    https://www.usestrata.dev/mcp \\',
      '    --header "Authorization: Bearer sk_..."',
    ],
  },
]

const TYPE_MS  = 35
const LINE_MS  = 120
const PAUSE_MS = 4000

export function TerminalDemo() {
  const [active, setActive] = useState(0)
  const [typed,  setTyped]  = useState(0)
  const [shown,  setShown]  = useState(0)
  const [nonce,  setNonce]  = useState(0)
  const [inView, setInView] = useState(false)

  const rootRef   = useRef<HTMLDivElement>(null)
  const bodyRef   = useRef<HTMLDivElement>(null)
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.25 },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    const el = bodyRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [shown])

  useEffect(() => {
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
    setTyped(0)
    setShown(0)
    if (!inView) return

    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const tab = TABS[active]

    if (reducedMotion) {
      setTyped(tab.command.length)
      setShown(tab.output.length)
      return
    }

    for (let i = 1; i <= tab.command.length; i++) {
      timersRef.current.push(setTimeout(() => setTyped(i), i * TYPE_MS))
    }

    const cmdDone = tab.command.length * TYPE_MS + 250

    for (let i = 1; i <= tab.output.length; i++) {
      timersRef.current.push(
        setTimeout(() => setShown(i), cmdDone + i * LINE_MS),
      )
    }

    const cycleDone = cmdDone + tab.output.length * LINE_MS + PAUSE_MS
    timersRef.current.push(setTimeout(() => setNonce(n => n + 1), cycleDone))

    return () => {
      timersRef.current.forEach(clearTimeout)
      timersRef.current = []
    }
  }, [active, inView, nonce])

  const tab      = TABS[active]
  const isTyping = typed < tab.command.length

  return (
    <div ref={rootRef} style={{ maxWidth: 880, margin: '0 auto' }} aria-live="off">
      <style>{`
        @keyframes strata-blink{0%,100%{opacity:1}50%{opacity:0}}
        .strata-tabs::-webkit-scrollbar{display:none}
      `}</style>

      {/* ── Tab row — scrollable on mobile ── */}
      <div
        role="tablist"
        aria-label="Terminal demo"
        className="strata-tabs"
        style={{
          display: 'flex',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {TABS.map((t, i) => (
          <button
            key={t.label}
            role="tab"
            aria-selected={i === active}
            onClick={() => setActive(i)}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: i === active ? '2px solid #00c472' : '2px solid transparent',
              marginBottom: -1,
              padding: '10px 18px',
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              letterSpacing: '0.10em',
              textTransform: 'uppercase',
              color: i === active ? '#00c472' : '#666',
              cursor: 'pointer',
              transition: 'color 0.15s',
              outline: 'none',
              flexShrink: 0,
              whiteSpace: 'nowrap',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Terminal card ── */}
      <div
        role="tabpanel"
        aria-label={tab.label}
        style={{
          background: '#0d1117',
          borderLeft:   '1px solid rgba(255,255,255,0.08)',
          borderRight:  '1px solid rgba(255,255,255,0.08)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '0 0 14px 14px',
          boxShadow: '0 30px 60px rgba(0,0,0,0.45)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Scanline overlay */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 2,
            opacity: 0.03,
            background: 'repeating-linear-gradient(0deg,#fff 0px 1px,transparent 1px 3px)',
          }}
        />

        {/* macOS title bar */}
        <div style={{
          height: 38,
          background: 'rgba(255,255,255,0.04)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 14px',
          gap: 8,
          position: 'relative',
          flexShrink: 0,
        }}>
          {(['#ff5f57', '#febc2e', '#28c840'] as const).map((c, i) => (
            <span
              key={i}
              aria-hidden="true"
              style={{ width: 12, height: 12, borderRadius: '50%', background: c, flexShrink: 0 }}
            />
          ))}
          <span style={{
            position: 'absolute', left: '50%', transform: 'translateX(-50%)',
            fontFamily: 'var(--font-mono)', fontSize: 12, color: '#888',
            letterSpacing: '0.04em', userSelect: 'none',
          }}>
            terminal — strata
          </span>
        </div>

        {/* Terminal body */}
        <div
          ref={bodyRef}
          style={{
            height: 320,
            overflow: 'hidden',
            padding: '20px 22px 28px',
            fontFamily: 'var(--font-mono)',
            fontSize: 13,
            lineHeight: 1.7,
            whiteSpace: 'pre',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {/* Prompt + command */}
          <div>
            <span style={{ color: '#00c472' }}>{tab.prompt}</span>
            {' '}
            <span style={{ color: '#e6edf3' }}>{tab.command.slice(0, typed)}</span>
            {isTyping && (
              <span
                aria-hidden="true"
                style={{
                  display: 'inline-block',
                  width: '0.55em',
                  height: '1em',
                  marginLeft: 1,
                  verticalAlign: '-2px',
                  background: '#00c472',
                  animation: 'strata-blink 1s steps(1,end) infinite',
                }}
              />
            )}
          </div>

          {/* Output lines */}
          {tab.output.slice(0, shown).map((text, i) => (
            <div key={i} style={{ color: COLOR[lineKind(text)] }}>
              {text || ' '}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
