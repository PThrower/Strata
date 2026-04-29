'use client'

import { useState, useTransition } from 'react'
import { regenerateApiKeyAction } from '@/app/actions/profile'

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
      <div className="flex items-center gap-2">
        <code className="font-mono text-sm bg-gray-50 px-3 py-2 rounded-md border flex-1 truncate">
          {displayKey}
        </code>
        <button
          onClick={() => setIsVisible((v) => !v)}
          className="text-xs text-gray-500 hover:text-gray-900 px-2 py-2 border rounded-md bg-white hover:bg-gray-50 transition-colors shrink-0"
        >
          {isVisible ? 'Hide' : 'Show'}
        </button>
        <button
          onClick={handleCopy}
          className="text-xs text-gray-500 hover:text-gray-900 px-2 py-2 border rounded-md bg-white hover:bg-gray-50 transition-colors shrink-0 min-w-[52px]"
        >
          {isCopied ? 'Copied!' : 'Copy'}
        </button>
        <button
          onClick={() => setIsConfirmOpen(true)}
          className="text-xs text-gray-500 hover:text-red-600 px-2 py-2 border rounded-md bg-white hover:bg-red-50 transition-colors shrink-0"
        >
          Regenerate
        </button>
      </div>

      {isConfirmOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl">
            <p className="text-sm font-medium mb-1">Regenerate API key?</p>
            <p className="text-sm text-gray-500 mb-5">
              This will invalidate your current key immediately. Any integrations
              using it will stop working.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setIsConfirmOpen(false)}
                disabled={isPending}
                className="text-sm px-4 py-2 border rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRegenerate}
                disabled={isPending}
                className="text-sm px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-60"
              >
                {isPending ? 'Regenerating...' : 'Regenerate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
