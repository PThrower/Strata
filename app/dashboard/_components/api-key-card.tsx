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

  const btnClass =
    'text-xs text-muted-foreground hover:text-foreground px-2 py-2 border border-border rounded-md bg-background hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shrink-0'

  return (
    <>
      <div className="flex items-center gap-2">
        <code className="font-mono text-sm bg-zinc-100 dark:bg-zinc-800 px-3 py-2 rounded-md border border-border flex-1 truncate">
          {displayKey}
        </code>
        <button onClick={() => setIsVisible((v) => !v)} className={btnClass}>
          {isVisible ? 'Hide' : 'Show'}
        </button>
        <button onClick={handleCopy} className={`${btnClass} min-w-[52px]`}>
          {isCopied ? 'Copied!' : 'Copy'}
        </button>
        <button
          onClick={() => setIsConfirmOpen(true)}
          className="text-xs text-muted-foreground hover:text-red-600 px-2 py-2 border border-border rounded-md bg-background hover:bg-red-50 dark:hover:bg-red-950 transition-colors shrink-0"
        >
          Regenerate
        </button>
      </div>

      {isConfirmOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl border border-border">
            <p className="text-sm font-medium mb-1">Regenerate API key?</p>
            <p className="text-sm text-muted-foreground mb-5">
              This will invalidate your current key immediately. Any integrations
              using it will stop working.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setIsConfirmOpen(false)}
                disabled={isPending}
                className="text-sm px-4 py-2 border border-border rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
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
