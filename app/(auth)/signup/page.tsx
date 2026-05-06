'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { signupAction } from '@/app/actions/auth'

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

function PasswordHint({ password }: { password: string }) {
  const checks = [
    { label: 'At least 8 characters', ok: password.length >= 8 },
    { label: 'Uppercase letter',       ok: /[A-Z]/.test(password) },
    { label: 'Lowercase letter',       ok: /[a-z]/.test(password) },
    { label: 'Number',                 ok: /\d/.test(password) },
    { label: 'Special character',      ok: /[^a-zA-Z0-9]/.test(password) },
  ]
  if (!password) return null
  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0 0', display: 'flex', flexDirection: 'column', gap: 4 }}>
      {checks.map(({ label, ok }) => (
        <li key={label} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          fontFamily: 'var(--font-mono)', fontSize: 11,
          color: ok ? '#00c472' : 'var(--ink-faint)',
        }}>
          <span>{ok ? '✓' : '○'}</span>
          {label}
        </li>
      ))}
    </ul>
  )
}

export default function SignupPage() {
  const [state, action, pending] = useActionState(signupAction, undefined)
  const [password, setPassword] = useState('')

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
        Create your account
      </p>

      <form action={action} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <label htmlFor="email" style={label}>Email</label>
          <input
            id="email" name="email" type="email"
            required autoComplete="email"
            className="auth-input"
          />
        </div>

        <div>
          <label htmlFor="password" style={label}>Password</label>
          <input
            id="password" name="password" type="password"
            required autoComplete="new-password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="auth-input"
          />
          <PasswordHint password={password} />
        </div>

        {state?.error && (
          <p style={{
            fontFamily: 'var(--font-sans)', fontSize: 13,
            color: '#ff7a45',
            padding: '10px 14px', borderRadius: 8,
            background: 'rgba(255,122,69,0.08)',
            border: '1px solid rgba(255,122,69,0.28)',
          }}>
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          style={{ ...submitBtn, opacity: pending ? 0.6 : 1 }}
        >
          {pending ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p style={{
        marginTop: 24, textAlign: 'center',
        fontFamily: 'var(--font-sans)', fontSize: 13,
        color: 'var(--ink-faint)',
      }}>
        Already have an account?{' '}
        <Link
          href="/login"
          style={{ color: '#00c472', fontWeight: 500, textDecoration: 'none' }}
        >
          Sign in
        </Link>
      </p>
    </>
  )
}
