'use client'

import { signoutAction } from '@/app/actions/auth'

export function SignOutButton() {
  return (
    <form action={signoutAction}>
      <button
        type="submit"
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 12, fontFamily: 'var(--font-mono)',
          color: 'var(--ink-faint)', paddingLeft: 12, paddingTop: 2,
          transition: 'color 150ms',
        }}
        onMouseOver={e => (e.currentTarget.style.color = 'var(--ink-soft)')}
        onMouseOut={e  => (e.currentTarget.style.color = 'var(--ink-faint)')}
      >
        Sign out
      </button>
    </form>
  )
}
