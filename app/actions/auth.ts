'use server'

import { redirect } from 'next/navigation'
import { createUserClient } from '@/lib/supabase-server'

export type AuthFormState = { error?: string } | undefined

export async function loginAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const supabase = await createUserClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) return { error: error.message }

  redirect('/dashboard')
}

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{8,}$/

export async function signupAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!PASSWORD_REGEX.test(password)) {
    return { error: 'Password must be at least 8 characters and include an uppercase letter, a number, and a special character.' }
  }

  const supabase = await createUserClient()
  const { error } = await supabase.auth.signUp({ email, password })

  if (error) {
    if (error.message.toLowerCase().includes('already registered') || error.message.toLowerCase().includes('already been registered')) {
      return { error: 'An account with this email already exists. Sign in instead?' }
    }
    return { error: error.message }
  }

  redirect('/dashboard')
}

export async function signoutAction() {
  const supabase = await createUserClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export type ForgotPasswordState = { error?: string; success?: boolean } | undefined

export async function forgotPasswordAction(
  _prev: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const email = formData.get('email') as string
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const supabase = await createUserClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${appUrl}/reset-password`,
  })

  if (error) return { error: error.message }
  return { success: true }
}

export async function resetPasswordAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const password = formData.get('password') as string

  if (!PASSWORD_REGEX.test(password)) {
    return { error: 'Password must be at least 8 characters and include an uppercase letter, a number, and a special character.' }
  }

  const supabase = await createUserClient()
  const { error } = await supabase.auth.updateUser({ password })

  if (error) return { error: error.message }

  redirect('/dashboard')
}
