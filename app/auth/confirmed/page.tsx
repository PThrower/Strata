import Link from 'next/link'

export default function ConfirmedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-zinc-950">
      <div className="w-full max-w-md p-8 bg-white dark:bg-zinc-900 rounded-xl border border-border shadow-sm text-center">
        <div
          className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-4"
          style={{ background: 'rgba(29,158,117,0.1)' }}
        >
          <span className="text-xl" style={{ color: '#1D9E75' }}>✓</span>
        </div>
        <h1 className="font-serif text-2xl font-semibold mb-2">Email confirmed</h1>
        <p className="text-sm text-muted-foreground mb-6">
          You&apos;re all set. Welcome to Strata.
        </p>
        <Link
          href="/dashboard"
          className="inline-block rounded-md px-6 py-2.5 text-sm font-medium text-white transition-colors hover:opacity-90"
          style={{ background: '#1D9E75', textDecoration: 'none' }}
        >
          Go to Dashboard →
        </Link>
      </div>
    </div>
  )
}
