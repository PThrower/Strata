'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { loginAction, resendConfirmationAction } from '@/app/actions/auth'

const label: React.CSSProperties = {
  display: 'block',
  fontFamily: 'var(--font-mono)',
  fontSize: 11, fontWeight: 500,
  letterSpacing: '0.12em', textTransform: 'uppercase',
  color: 'var(--ink-soft)',
  marginBottom: 6,
}

const submitBtn: React.CSSProperties = {
  display: 'block', width: '100%',
  padding: '12px',
  background: '#00c472', color: '#000',
  fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700,
  letterSpacing: '0.10em', textTransform: 'uppercase',
  border: 'none', borderRadius: 8, cursor: 'pointer',
  transition: 'opacity 150ms',
}

export default function LoginPage() {
  const [state, action, pending] = useActionState(loginAction, undefined)
  const [resendState, resendAction, resendPending] = useActionState(resendConfirmationAction, undefined)

  return (
    <>
      <Link
        href="/"
        className="brand-gradient-text"
        style={{
          fontFamily: 'var(--font-serif)', fontSize: 24, fontWeight: 400,
          letterSpacing: '0.12em', textDecoration: 'none',
          display: 'block', marginBottom: 6,
        }}
      >
        Strata
      </Link>
      <p style={{
        fontFamily: 'var(--font-sans)', fontSize: 14,
        color: 'var(--ink-faint)', marginBottom: 28,
      }}>
        Sign in to your account
      </p>

      <form action={action} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <label htmlFor="email" style={label}>Email</label>
          <input
            id="email" name="email" type="email"
            required autoFocus autoComplete="username"
            className="auth-input"
          />
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={label}>Password</span>
            <Link
              href="/forgot-password"
              style={{
                fontFamily: 'var(--font-mono)', fontSize: 11,
                color: '#00c472', textDecoration: 'none',
              }}
            >
              Forgot password?
            </Link>
          </div>
          <input
            id="password" name="password" type="password"
            required autoComplete="current-password"
            className="auth-input"
          />
        </div>

        {state?.unverified ? (
          <div style={{
            borderRadius: 10, padding: '12px 14px',
            background: 'rgba(245,176,66,0.08)',
            border: '1px solid rgba(245,176,66,0.30)',
          }}>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: '#f5b042', marginBottom: 8 }}>
              {state.error}
            </p>
            {resendState?.sent ? (
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#00c472' }}>
                Confirmation email sent — check your inbox.
              </p>
            ) : (
              <form action={resendAction}>
                <input type="hidden" name="email" value={state.email ?? ''} />
                <button
                  type="submit"
                  disabled={resendPending}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                    fontFamily: 'var(--font-mono)', fontSize: 12,
                    color: '#00c472', textDecoration: 'underline',
                    opacity: resendPending ? 0.6 : 1,
                  }}
                >
                  {resendPending ? 'Sending…' : 'Resend confirmation email →'}
                </button>
              </form>
            )}
          </div>
        ) : state?.error ? (
          <p style={{
            fontFamily: 'var(--font-sans)', fontSize: 13,
            color: '#ff7a45',
            padding: '10px 14px', borderRadius: 8,
            background: 'rgba(255,122,69,0.08)',
            border: '1px solid rgba(255,122,69,0.28)',
          }}>
            {state.error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          style={{ ...submitBtn, opacity: pending ? 0.6 : 1 }}
        >
          {pending ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p style={{
        marginTop: 24, textAlign: 'center',
        fontFamily: 'var(--font-sans)', fontSize: 13,
        color: 'var(--ink-faint)',
      }}>
        Don&apos;t have an account?{' '}
        <Link
          href="/signup"
          style={{ color: '#00c472', fontWeight: 500, textDecoration: 'none' }}
        >
          Sign up
        </Link>
      </p>
    </>
  )
}
