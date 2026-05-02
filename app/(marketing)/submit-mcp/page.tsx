'use client'

import { useState } from 'react'
import { Glass } from '@/components/ui/glass'

const MCP_CATEGORIES = [
  'Browser Automation',
  'Cloud Platforms',
  'Code Execution',
  'Communication',
  'Databases',
  'Data Processing',
  'Developer Tools',
  'File System',
  'Finance',
  'Gaming',
  'Knowledge & Memory',
  'Language & Translation',
  'Media Production',
  'Monitoring',
  'Other Tools and Integrations',
  'Research & Data',
  'Security',
  'Search',
  'Testing',
]

type ResultState =
  | { status: 'live'; securityScore: number | null }
  | { status: 'pending_review' }
  | { status: 'error'; message: string }

export default function SubmitMcpPage() {
  const [githubUrl,      setGithubUrl]      = useState('')
  const [name,           setName]           = useState('')
  const [description,    setDescription]    = useState('')
  const [category,       setCategory]       = useState('')
  const [submitterEmail, setSubmitterEmail] = useState('')
  const [loading,        setLoading]        = useState(false)
  const [result,         setResult]         = useState<ResultState | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/mcp-submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          githubUrl,
          name,
          description,
          category,
          submitterEmail: submitterEmail || undefined,
        }),
      })
      const data = await res.json() as {
        status?: string; security_score?: number | null; message?: string; error?: string
      }
      if (!res.ok) {
        setResult({ status: 'error', message: data.error ?? 'Something went wrong' })
        return
      }
      if (data.status === 'live') {
        setResult({ status: 'live', securityScore: data.security_score ?? null })
      } else {
        setResult({ status: 'pending_review' })
      }
    } catch {
      setResult({ status: 'error', message: 'Network error — please try again' })
    } finally {
      setLoading(false)
    }
  }

  function reset() {
    setGithubUrl(''); setName(''); setDescription(''); setCategory('')
    setSubmitterEmail(''); setResult(null)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(255,255,255,0.04)',
    color: 'var(--ink)',
    fontSize: 14,
    outline: 'none',
    fontFamily: 'var(--font-sans)',
  }
  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 12,
    fontWeight: 500,
    color: 'var(--ink-faint)',
    marginBottom: 6,
    fontFamily: 'var(--font-mono)',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
  }

  if (result && result.status !== 'error') {
    return (
      <div style={{ maxWidth: 560, margin: '80px auto 0', padding: '0 16px' }}>
        <Glass style={{ padding: '40px 36px' }}>
          {result.status === 'live' ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <span style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: 'var(--emerald-glow)',
                  boxShadow: '0 0 10px rgba(95,176,133,0.8)',
                  flexShrink: 0,
                }} />
                <span style={{ color: 'var(--emerald-glow)', fontWeight: 600, fontSize: 15 }}>
                  Added to Directory
                </span>
              </div>
              <p style={{ color: 'var(--ink-soft)', fontSize: 14, marginBottom: 20, lineHeight: 1.6 }}>
                Your MCP server is now live in the Strata directory and discoverable via{' '}
                <code style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--emerald-light)' }}>
                  find_mcp_servers
                </code>.
              </p>
              {result.securityScore !== null && (
                <p style={{ fontSize: 13, color: 'var(--ink-muted)', marginBottom: 20 }}>
                  Security score:{' '}
                  <span style={{ color: 'var(--emerald-glow)', fontWeight: 600 }}>
                    {result.securityScore}
                    <span style={{ color: 'var(--ink-faint)', fontWeight: 400 }}>/100</span>
                  </span>
                </p>
              )}
              <button
                onClick={reset}
                style={{ fontSize: 13, color: 'var(--emerald-glow)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
              >
                Submit another server
              </button>
            </>
          ) : (
            <>
              <p style={{ color: 'var(--ink)', fontWeight: 600, fontSize: 15, marginBottom: 12 }}>
                Submission received
              </p>
              <p style={{ color: 'var(--ink-soft)', fontSize: 14, marginBottom: 20, lineHeight: 1.6 }}>
                Your MCP server is pending review by our team. We&apos;ll reach out if we have questions.
              </p>
              <button
                onClick={reset}
                style={{ fontSize: 13, color: 'var(--emerald-glow)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
              >
                Submit another server
              </button>
            </>
          )}
        </Glass>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 640, margin: '80px auto 0', padding: '0 16px' }}>
      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <p style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: '0.12em',
          color: 'var(--ink-faint)',
          textTransform: 'uppercase',
          marginBottom: 12,
        }}>
          MCP Directory
        </p>
        <h1 style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 42,
          fontWeight: 500,
          letterSpacing: '-0.02em',
          lineHeight: 1.1,
          color: 'var(--ink)',
          marginBottom: 16,
        }}>
          Submit your MCP server
        </h1>
        <p style={{ fontSize: 15, color: 'var(--ink-muted)', lineHeight: 1.65, maxWidth: 480 }}>
          Add your MCP server directly to the Strata directory. Clean submissions are published
          immediately — no need to wait for awesome-mcp-servers.
        </p>
      </div>

      {/* Form */}
      <Glass>
        <form
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: 22, padding: '32px 28px' }}
        >
          {/* GitHub URL */}
          <div>
            <label style={labelStyle}>
              GitHub URL <span style={{ color: 'rgba(239,68,68,0.8)' }}>*</span>
            </label>
            <input
              type="url"
              required
              value={githubUrl}
              onChange={e => setGithubUrl(e.target.value)}
              placeholder="https://github.com/owner/repo"
              pattern="https://github\.com/[^/\s]+/[^/\s]+"
              title="Must be a github.com/owner/repo URL"
              style={inputStyle}
            />
            <p style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 5 }}>
              Must be a public GitHub repository
            </p>
          </div>

          {/* Name */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <label style={{ ...labelStyle, margin: 0 }}>
                Name <span style={{ color: 'rgba(239,68,68,0.8)' }}>*</span>
              </label>
              <span style={{ fontSize: 11, color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)' }}>
                {name.length}/100
              </span>
            </div>
            <input
              type="text"
              required
              maxLength={100}
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Playwright MCP"
              style={inputStyle}
            />
          </div>

          {/* Description */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <label style={{ ...labelStyle, margin: 0 }}>
                Description <span style={{ color: 'rgba(239,68,68,0.8)' }}>*</span>
              </label>
              <span style={{ fontSize: 11, color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)' }}>
                {description.length}/500
              </span>
            </div>
            <textarea
              required
              minLength={10}
              maxLength={500}
              rows={4}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What does this MCP server do? What tools does it expose?"
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>

          {/* Category */}
          <div>
            <label style={labelStyle}>
              Category <span style={{ color: 'rgba(239,68,68,0.8)' }}>*</span>
            </label>
            <select
              required
              value={category}
              onChange={e => setCategory(e.target.value)}
              style={{
                ...inputStyle,
                cursor: 'pointer',
                // Fix for dark background showing white in Safari
                colorScheme: 'dark',
              }}
            >
              <option value="">Select a category…</option>
              {MCP_CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Submitter email (optional) */}
          <div>
            <label style={labelStyle}>
              Email{' '}
              <span style={{ color: 'var(--ink-faint)', textTransform: 'none', letterSpacing: 0 }}>
                (optional — for approval notification)
              </span>
            </label>
            <input
              type="email"
              value={submitterEmail}
              onChange={e => setSubmitterEmail(e.target.value)}
              placeholder="you@example.com"
              style={inputStyle}
            />
          </div>

          {result?.status === 'error' && (
            <p style={{ fontSize: 13, color: 'rgba(239,68,68,0.9)', margin: 0 }}>
              {result.message}
            </p>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, paddingTop: 4 }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '10px 24px',
                borderRadius: 10,
                border: 'none',
                background: 'var(--emerald)',
                color: 'white',
                fontSize: 14,
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
                transition: 'opacity 150ms',
                fontFamily: 'var(--font-sans)',
              }}
            >
              {loading ? 'Submitting…' : 'Submit Server'}
            </button>
            {loading && (
              <span style={{ fontSize: 13, color: 'var(--ink-faint)' }}>
                Fetching GitHub metadata…
              </span>
            )}
          </div>

          <p style={{ fontSize: 12, color: 'var(--ink-faint)', margin: 0 }}>
            Submissions are scanned for injection and scored on GitHub activity.
            Clean submissions go live immediately; borderline ones are reviewed by our team.
          </p>
        </form>
      </Glass>
    </div>
  )
}
