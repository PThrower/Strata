'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function McpAdminActions({ id }: { id: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function act(action: 'approve' | 'reject') {
    setBusy(action)
    setError(null)
    try {
      const res = await fetch(`/api/mcp-submissions/${id}/${action}`, { method: 'POST' })
      if (!res.ok) {
        const d = await res.json() as { error?: string }
        setError(d.error ?? 'Request failed')
      } else {
        router.refresh()
      }
    } catch {
      setError('Network error')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => act('approve')}
        disabled={busy !== null}
        className="text-xs px-3 py-1.5 rounded-md font-medium transition-colors disabled:opacity-50"
        style={{ background: '#00c472', color: 'white', border: 'none', cursor: busy ? 'not-allowed' : 'pointer' }}
      >
        {busy === 'approve' ? 'Approving…' : 'Approve'}
      </button>
      <button
        onClick={() => act('reject')}
        disabled={busy !== null}
        className="text-xs px-3 py-1.5 rounded-md font-medium transition-colors disabled:opacity-50 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
        style={{ cursor: busy ? 'not-allowed' : 'pointer' }}
      >
        {busy === 'reject' ? 'Rejecting…' : 'Reject'}
      </button>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  )
}
