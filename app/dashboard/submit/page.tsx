'use client'

import { useState } from 'react'
import Link from 'next/link'

const ECOSYSTEM_GROUPS = [
  {
    label: 'Core Ecosystems',
    options: [
      { value: 'claude',    label: 'Claude' },
      { value: 'openai',    label: 'ChatGPT' },
      { value: 'gemini',    label: 'Gemini' },
      { value: 'langchain', label: 'LangChain' },
      { value: 'ollama',    label: 'Ollama' },
    ],
  },
  {
    label: 'AI Coding Tools (Pro)',
    options: [
      { value: 'cursor',     label: 'Cursor' },
      { value: 'claudecode', label: 'Claude Code' },
      { value: 'windsurf',   label: 'Windsurf' },
      { value: 'copilot',    label: 'Copilot' },
      { value: 'cody',       label: 'Cody' },
    ],
  },
  {
    label: 'AI Search & Research (Pro)',
    options: [
      { value: 'perplexity', label: 'Perplexity' },
      { value: 'youcom',     label: 'You.com' },
      { value: 'exa',        label: 'Exa' },
    ],
  },
  {
    label: 'AI Infrastructure (Pro)',
    options: [
      { value: 'replicate',  label: 'Replicate' },
      { value: 'togetherai', label: 'Together.ai' },
      { value: 'groq',       label: 'Groq' },
      { value: 'fireworks',  label: 'Fireworks' },
    ],
  },
  {
    label: 'AI Agents & Media (Pro)',
    options: [
      { value: 'manus',      label: 'Manus' },
      { value: 'higgsfield', label: 'Higgsfield' },
      { value: 'v0',         label: 'v0' },
      { value: 'bolt',       label: 'Bolt' },
    ],
  },
]

const CATEGORIES = [
  { value: 'best_practices', label: 'Best Practice' },
  { value: 'integrations',   label: 'Integration / MCP' },
  { value: 'news',           label: 'News' },
]

type ResultStatus = 'approved' | 'flagged' | 'rejected'

interface SubmitResult {
  status: ResultStatus
  reasoning: string
}

const input = `
  width: 100%;
  padding: 9px 12px;
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  transition: border-color 150ms;
`

export default function SubmitPage() {
  const [ecosystem, setEcosystem]   = useState('')
  const [category,  setCategory]    = useState('')
  const [title,     setTitle]       = useState('')
  const [content,   setContent]     = useState('')
  const [sourceUrl, setSourceUrl]   = useState('')
  const [loading,   setLoading]     = useState(false)
  const [error,     setError]       = useState<string | null>(null)
  const [result,    setResult]      = useState<SubmitResult | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ecosystem, category, title, body: content, sourceUrl: sourceUrl || undefined }),
      })
      const data = await res.json() as { status?: ResultStatus; reasoning?: string; error?: string }

      if (!res.ok) {
        setError(data.error ?? 'Something went wrong')
        return
      }

      setResult({ status: data.status!, reasoning: data.reasoning ?? '' })
    } catch {
      setError('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }

  function reset() {
    setTitle('')
    setContent('')
    setSourceUrl('')
    setEcosystem('')
    setCategory('')
    setResult(null)
    setError(null)
  }

  const card = 'bg-white dark:bg-zinc-900 rounded-lg border border-border p-6'
  const fieldLabel = 'block text-xs font-medium text-muted-foreground mb-1.5'
  const fieldInput = 'w-full px-3 py-2 rounded-md border border-border bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600'

  if (result) {
    return (
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <h1 className="font-serif text-2xl font-semibold mb-8">Submit Content</h1>
        <div className={card}>
          {result.status === 'approved' && (
            <>
              <p className="text-base font-medium mb-1" style={{ color: '#00c472' }}>Published!</p>
              <p className="text-sm text-muted-foreground mb-4">Your submission is now live in the API.</p>
              <Link href="/docs" className="text-sm" style={{ color: '#00c472' }}>View it in the API →</Link>
            </>
          )}
          {result.status === 'flagged' && (
            <>
              <p className="text-base font-medium mb-1">Under Review</p>
              <p className="text-sm text-muted-foreground mb-4">Your submission is being reviewed by our team.</p>
              <Link href="/dashboard/submissions" className="text-sm" style={{ color: '#00c472' }}>View your submissions →</Link>
            </>
          )}
          {result.status === 'rejected' && (
            <>
              <p className="text-base font-medium mb-1 text-red-500">Not Published</p>
              <p className="text-sm text-muted-foreground mb-4">
                This submission didn&apos;t meet our quality standards. Common reasons: too generic,
                not specific enough, or not relevant to the ecosystem.
              </p>
              <button
                onClick={reset}
                className="text-sm"
                style={{ color: '#00c472', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                Try again with more detail →
              </button>
            </>
          )}
          {result.reasoning && (
            <p className="text-xs text-muted-foreground mt-4 pt-4 border-t border-border">
              {result.reasoning}
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto' }}>
      <div className="mb-8">
        <h1 className="font-serif text-2xl font-semibold mb-1">Submit Content</h1>
        <p className="text-sm text-muted-foreground">
          Share an MCP, integration, tip, or news item with the community.
          High-quality submissions are published automatically.
        </p>
      </div>

      <form onSubmit={handleSubmit} className={card} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={fieldLabel}>Ecosystem <span className="text-red-400">*</span></label>
            <select
              required
              value={ecosystem}
              onChange={e => setEcosystem(e.target.value)}
              className={fieldInput}
            >
              <option value="">Select…</option>
              {ECOSYSTEM_GROUPS.map(group => (
                <optgroup key={group.label} label={group.label}>
                  {group.options.map(e => (
                    <option key={e.value} value={e.value}>{e.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <div>
            <label className={fieldLabel}>Category <span className="text-red-400">*</span></label>
            <select
              required
              value={category}
              onChange={e => setCategory(e.target.value)}
              className={fieldInput}
            >
              <option value="">Select…</option>
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className={fieldLabel} style={{ margin: 0 }}>Title <span className="text-red-400">*</span></label>
            <span className="text-xs text-muted-foreground tabular-nums">{title.length} / 10 min</span>
          </div>
          <input
            type="text"
            required
            minLength={10}
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Use structured outputs for downstream parsing"
            className={fieldInput}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className={fieldLabel} style={{ margin: 0 }}>Content <span className="text-red-400">*</span></label>
            <span className="text-xs text-muted-foreground tabular-nums">{content.length} / 50 min</span>
          </div>
          <textarea
            required
            minLength={50}
            rows={4}
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Describe the integration, tip, or news item in detail…"
            className={fieldInput}
            style={{ resize: 'vertical' }}
          />
        </div>

        <div>
          <label className={fieldLabel}>Source URL <span className="text-muted-foreground">(optional)</span></label>
          <input
            type="url"
            value={sourceUrl}
            onChange={e => setSourceUrl(e.target.value)}
            placeholder="https://…"
            className={fieldInput}
          />
        </div>

        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="text-sm font-medium px-4 py-2.5 rounded-md transition-colors disabled:opacity-60"
          style={{
            background: '#00c472',
            color: 'white',
            border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer',
            alignSelf: 'flex-start',
          }}
        >
          {loading ? 'Submitting…' : 'Submit for Review'}
        </button>

      </form>
    </div>
  )
}
