'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { loginAction, resendConfirmationAction } from '@/app/actions/auth'

export default function LoginPage() {
  const [state, action, pending] = useActionState(loginAction, undefined)
  const [resendState, resendAction, resendPending] = useActionState(resendConfirmationAction, undefined)

  return (
    <>
      <Link href="/" className="font-serif text-2xl font-semibold mb-1 brand-gradient-text no-underline hover:opacity-80 transition-opacity" style={{ textDecoration: 'none', display: 'block' }}>Strata</Link>
      <p className="text-sm text-muted-foreground mb-6">Sign in to your account</p>

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
            autoFocus
            autoComplete="username"
            className="border border-border rounded-md px-3 py-2 text-sm bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent"
          />
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Password
            </label>
            <Link href="/forgot-password" className="text-xs text-[#1D9E75] hover:underline">
              Forgot password?
            </Link>
          </div>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="border border-border rounded-md px-3 py-2 text-sm bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent"
          />
        </div>

        {state?.unverified ? (
          <div className="flex flex-col gap-2 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-3 py-2.5">
            <p className="text-sm text-amber-700 dark:text-amber-400">{state.error}</p>
            {resendState?.sent ? (
              <p className="text-sm text-[#1D9E75]">Confirmation email sent — check your inbox.</p>
            ) : (
              <form action={resendAction}>
                <input type="hidden" name="email" value={state.email ?? ''} />
                <button
                  type="submit"
                  disabled={resendPending}
                  className="text-sm text-[#1D9E75] hover:underline disabled:opacity-60"
                >
                  {resendPending ? 'Sending…' : 'Resend confirmation email →'}
                </button>
              </form>
            )}
          </div>
        ) : state?.error ? (
          <p className="text-sm text-red-500">{state.error}</p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="bg-[#1D9E75] text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-[#18896a] transition-colors disabled:opacity-60"
        >
          {pending ? 'Signing in...' : 'Sign in'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="text-[#1D9E75] font-medium hover:underline">
          Sign up
        </Link>
      </p>
    </>
  )
}
