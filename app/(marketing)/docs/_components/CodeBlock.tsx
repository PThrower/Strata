'use client'

import { useState, type CSSProperties } from 'react'

interface CodeBlockProps {
  code: string
  lang?: string
  copyable?: boolean
}

export function CodeBlock({ code, lang, copyable = true }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard API unavailable — silently no-op.
    }
  }

  const wrapStyle: CSSProperties = {
    position: 'relative',
    fontFamily: 'var(--font-mono)',
    fontSize: 12.5,
    lineHeight: 1.7,
    color: 'var(--ink-soft)',
    margin: 0,
    padding: '14px 18px',
    background: 'rgba(255,255,255,0.025)',
    border: '1px solid var(--hair)',
    borderRadius: 14,
    overflowX: 'auto',
    whiteSpace: 'pre',
  }

  return (
    <div style={{ position: 'relative', margin: '14px 0' }}>
      {lang && (
        <span
          style={{
            position: 'absolute', top: -10, left: 14, zIndex: 2,
            fontFamily: 'var(--font-mono)', fontSize: 9.5,
            fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase',
            color: 'var(--ink-faint)',
            background: 'var(--bg-1)', padding: '0 8px',
          }}
        >
          {lang}
        </span>
      )}
      <pre style={wrapStyle}>
        <code>{code}</code>
      </pre>
      {copyable && (
        <button
          type="button"
          onClick={handleCopy}
          aria-label={copied ? 'Copied' : 'Copy to clipboard'}
          style={{
            position: 'absolute', top: 10, right: 10,
            fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 500,
            letterSpacing: '0.12em', textTransform: 'uppercase',
            color: copied ? 'var(--emerald-glow)' : 'var(--ink-faint)',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid var(--hair)',
            borderRadius: 8, padding: '4px 8px', cursor: 'pointer',
            transition: 'color 120ms ease, border-color 120ms ease',
          }}
          onMouseEnter={(e) => { (e.target as HTMLButtonElement).style.borderColor = 'var(--hair-strong)' }}
          onMouseLeave={(e) => { (e.target as HTMLButtonElement).style.borderColor = 'var(--hair)' }}
        >
          {copied ? '✓ copied' : 'copy'}
        </button>
      )}
    </div>
  )
}
