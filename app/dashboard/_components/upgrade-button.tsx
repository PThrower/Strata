'use client'

import { useState } from 'react'

export default function UpgradeButton() {
  const [loading, setLoading] = useState(false)

  async function handleUpgrade() {
    setLoading(true)
    try {
      const res = await fetch('/api/stripe/checkout', { method: 'POST' })
      const { url } = await res.json()
      if (url) window.location.href = url
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleUpgrade}
      disabled={loading}
      className="text-sm px-4 py-2 bg-[#1D9E75] text-white rounded-md font-medium hover:bg-[#18896a] transition-colors disabled:opacity-60"
    >
      {loading ? 'Loading...' : 'upgrade to pro — $29/mo'}
    </button>
  )
}
