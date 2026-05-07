'use client'

import { useState, useTransition } from 'react'
import { regenerateApiKeyAction } from '@/app/actions/profile'

const btnStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500,
  padding: '5px 10px', borderRadius: 6, cursor: 'pointer',
  border: '1px solid rgba(0,196,114,0.30)',
  background: 'transparent', color: '#00c472',
  transition: 'opacity 150ms', flexShrink: 0,
}

const btnDangerStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500,
  padding: '5px 10px', borderRadius: 6, cursor: 'pointer',
  border: '1px solid rgba(255,122,69,0.30)',
  background: 'transparent', color: '#ff7a45',
  transition: 'opacity 150ms', flexShrink: 0,
}

export default function ApiKeyCard({ apiKey }: { apiKey: string }) {
  const [isVisible, setIsVisible] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const maskedKey = `sk_${'•'.repeat(24)}${apiKey.slice(-4)}`
  const displayKey = isVisible ? apiKey : maskedKey

  function handleCopy() {
    navigator.clipboard.writeText(apiKey)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
  }

  function handleConfirmRegenerate() {
    startTransition(async () => {
      await regenerateApiKeyAction()
      setIsConfirmOpen(false)
    })
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <code style={{
          fontFamily: 'var(--font-mono)', fontSize: 12,
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid var(--hair)',
          color: 'var(--ink-soft)',
          padding: '7px 12px', borderRadius: 8,
          flex: '1 1 0', minWidth: 0,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          display: 'block',
        }}>
          {displayKey}
        </code>
        <button onClick={() => setIsVisible(v => !v)} style={btnStyle} disabled={isPending}>
          {isVisible ? 'Hide' : 'Show'}
        </button>
        <button onClick={handleCopy} style={{ ...btnStyle, minWidth: 52 }} disabled={isPending}>
          {isCopied ? 'Copied!' : 'Copy'}
        </button>
        <button onClick={() => setIsConfirmOpen(true)} style={btnDangerStyle} disabled={isPending}>
          Regenerate
        </button>
      </div>

      {isConfirmOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 50,
          background: 'rgba(4,5,12,0.65)',
          backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 16,
        }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 35%, rgba(0,196,114,0.05) 100%)',
            backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)',
            border: '1px solid rgba(255,255,255,0.16)',
            borderRadius: 22, padding: 24, maxWidth: 380, width: '100%',
          }}>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 500, color: 'var(--ink)', marginBottom: 8 }}>
              Regenerate API key?
            </p>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ink-muted)', marginBottom: 20, lineHeight: 1.5 }}>
              This will invalidate your current key immediately. Any integrations using it will stop working.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setIsConfirmOpen(false)}
                disabled={isPending}
                style={btnStyle}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRegenerate}
                disabled={isPending}
                style={{ ...btnDangerStyle, opacity: isPending ? 0.6 : 1 }}
              >
                {isPending ? 'Regenerating…' : 'Regenerate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
