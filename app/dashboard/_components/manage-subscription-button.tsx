'use client'

import { useState } from 'react'

export default function ManageSubscriptionButton() {
  const [loading, setLoading] = useState(false)

  async function handleManage() {
    setLoading(true)
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const { url } = await res.json()
      if (url) window.location.href = url
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleManage}
      disabled={loading}
      className="text-sm px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60"
    >
      {loading ? 'Loading...' : 'manage subscription'}
    </button>
  )
}
