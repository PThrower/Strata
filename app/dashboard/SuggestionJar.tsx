'use client'

import { useActionState, useState, useEffect, useRef } from 'react'
import { submitSuggestionAction } from '@/app/actions/suggestions'

export default function SuggestionJar() {
  const [state, action, pending] = useActionState(submitSuggestionAction, undefined)
  const [isOpen, setIsOpen] = useState(false)
  const [content, setContent] = useState('')
  const [showNoteFall, setShowNoteFall] = useState(false)
  const [successMsg, setSuccessMsg] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (state?.success) {
      setShowNoteFall(true)
      setContent('')
      setIsOpen(false)
      setSuccessMsg(true)
      const t1 = setTimeout(() => setShowNoteFall(false), 700)
      const t2 = setTimeout(() => setSuccessMsg(false), 3000)
      return () => { clearTimeout(t1); clearTimeout(t2) }
    }
  }, [state])

  useEffect(() => {
    if (isOpen) textareaRef.current?.focus()
  }, [isOpen])

  const charCount = content.length
  const canSubmit = charCount >= 10 && !pending

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg border border-border p-4 mt-6">
      <h2 style={{ fontFamily: 'ui-serif, Georgia, serif', fontWeight: 600, fontSize: 15, marginBottom: 3 }}>
        Suggestion Jar
      </h2>
      <p className="text-sm text-muted-foreground" style={{ marginBottom: 16 }}>
        Got an idea? Drop it in.
      </p>

      {/* Jar + falling note */}
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
        {showNoteFall && <div className="sjar-note-fall" />}

        <svg
          className="sjar-svg"
          width="80"
          height="112"
          viewBox="0 0 80 112"
          onClick={() => setIsOpen(v => !v)}
          role="button"
          tabIndex={0}
          aria-label={isOpen ? 'Close suggestion jar' : 'Open suggestion jar'}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              setIsOpen(v => !v)
            }
          }}
        >
          {/* Lid */}
          <rect x="10" y="2" width="60" height="18" rx="6"
            fill="rgba(0,196,114,0.13)" stroke="rgba(0,196,114,0.60)" strokeWidth="1.5"
          />
          <rect x="14" y="5" width="32" height="5" rx="2.5"
            fill="rgba(255,255,255,0.20)"
          />

          {/* Body */}
          <rect x="13" y="19" width="54" height="89" rx="11"
            fill="rgba(0,196,114,0.07)" stroke="rgba(0,196,114,0.48)" strokeWidth="1.5"
          />

          {/* Glass reflections */}
          <rect x="18" y="28" width="4" height="68" rx="2"
            fill="rgba(255,255,255,0.22)"
          />
          <rect x="25" y="24" width="2" height="22" rx="1"
            fill="rgba(255,255,255,0.12)"
          />

          {/* Note 3 — upper left */}
          <g className="sjar-note-3">
            <rect x="20" y="42" width="20" height="13" rx="3"
              fill="#00c472" fillOpacity="0.85"
            />
            <line x1="23" y1="47.5" x2="37" y2="47.5"
              stroke="rgba(255,255,255,0.45)" strokeWidth="1.2" strokeLinecap="round"
            />
            <line x1="23" y1="51" x2="33" y2="51"
              stroke="rgba(255,255,255,0.28)" strokeWidth="1" strokeLinecap="round"
            />
          </g>

          {/* Note 2 — middle right */}
          <g className="sjar-note-2">
            <rect x="43" y="50" width="17" height="12" rx="3"
              fill="#00c472" fillOpacity="0.70"
            />
            <line x1="46" y1="55.5" x2="57" y2="55.5"
              stroke="rgba(255,255,255,0.40)" strokeWidth="1.2" strokeLinecap="round"
            />
          </g>

          {/* Note 1 — lower left */}
          <g className="sjar-note-1">
            <rect x="18" y="65" width="22" height="14" rx="3"
              fill="#00c472" fillOpacity="0.90"
            />
            <line x1="21" y1="71" x2="37" y2="71"
              stroke="rgba(255,255,255,0.50)" strokeWidth="1.2" strokeLinecap="round"
            />
            <line x1="21" y1="74.5" x2="31" y2="74.5"
              stroke="rgba(255,255,255,0.28)" strokeWidth="1" strokeLinecap="round"
            />
          </g>

          {/* Note 4 — lower right */}
          <g className="sjar-note-4">
            <rect x="43" y="77" width="14" height="10" rx="3"
              fill="#00c472" fillOpacity="0.65"
            />
            <line x1="46" y1="82" x2="54" y2="82"
              stroke="rgba(255,255,255,0.35)" strokeWidth="1.2" strokeLinecap="round"
            />
          </g>
        </svg>
      </div>

      {/* Sliding textarea */}
      <div style={{
        maxHeight: isOpen ? '220px' : '0px',
        overflow: 'hidden',
        opacity: isOpen ? 1 : 0,
        transition: 'max-height 0.35s cubic-bezier(0.4,0,0.2,1), opacity 0.25s ease',
      }}>
        <form action={action} style={{ paddingTop: 4 }}>
          <textarea
            ref={textareaRef}
            name="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What would make Strata better for you?"
            maxLength={500}
            rows={3}
            className="w-full border border-border rounded-md px-3 py-2 text-sm bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#00c472] focus:border-transparent resize-none"
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
            <span style={{
              fontFamily: 'ui-monospace, monospace',
              fontSize: 11,
              color: charCount > 480 ? '#f59e0b' : 'var(--muted-foreground)' ,
            }}>
              {charCount} / 500
            </span>
            <button
              type="submit"
              disabled={!canSubmit}
              style={{
                background: '#00c472',
                color: 'white',
                border: 'none',
                borderRadius: 6,
                padding: '6px 16px',
                fontSize: 13,
                fontWeight: 500,
                cursor: canSubmit ? 'pointer' : 'not-allowed',
                opacity: canSubmit ? 1 : 0.5,
                transition: 'opacity 0.15s',
              }}
            >
              {pending ? 'Dropping...' : 'Drop it in'}
            </button>
          </div>
        </form>
      </div>

      {/* Success message */}
      {successMsg && (
        <p className="sjar-msg-fade text-center text-sm" style={{ color: '#00c472', marginTop: 10 }}>
          Dropped in! Thanks for the idea.
        </p>
      )}

      {/* Error message */}
      {state?.error && !state.success && (
        <p className="text-center text-sm text-red-500" style={{ marginTop: 10 }}>
          {state.error}
        </p>
      )}
    </div>
  )
}
