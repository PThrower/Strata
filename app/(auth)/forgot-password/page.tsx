'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { forgotPasswordAction } from '@/app/actions/auth'

export default function ForgotPasswordPage() {
  const [state, action, pending] = useActionState(forgotPasswordAction, undefined)

  if (state?.success) {
    return (
      <>
        <Link href="/" className="font-serif text-2xl font-semibold mb-1 text-zinc-900 dark:text-zinc-50 no-underline hover:opacity-80 transition-opacity" style={{ textDecoration: 'none', display: 'block' }}>Strata</Link>
        <p className="text-sm text-muted-foreground mb-6">Reset your password</p>
        <div className="rounded-md border border-border p-4 text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
          Check your email — if an account exists for that address, we sent a password reset link. It expires in 1 hour.
        </div>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link href="/login" className="text-[#1D9E75] font-medium hover:underline">
            Back to sign in
          </Link>
        </p>
      </>
    )
  }

  return (
    <>
      <Link href="/" className="font-serif text-2xl font-semibold mb-1 text-zinc-900 dark:text-zinc-50 no-underline hover:opacity-80 transition-opacity" style={{ textDecoration: 'none', display: 'block' }}>Strata</Link>
      <p className="text-sm text-muted-foreground mb-6">Reset your password</p>

      <form action={action} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="email" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="border border-border rounded-md px-3 py-2 text-sm bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent"
          />
        </div>

        {state?.error && (
          <p className="text-sm text-red-500">{state.error}</p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="bg-[#1D9E75] text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-[#18896a] transition-colors disabled:opacity-60"
        >
          {pending ? 'Sending...' : 'Send reset link'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link href="/login" className="text-[#1D9E75] font-medium hover:underline">
          Back to sign in
        </Link>
      </p>
    </>
  )
}
