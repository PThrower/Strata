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

export async function signupAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const supabase = await createUserClient()
  const { error } = await supabase.auth.signUp({ email, password })

  if (error) return { error: error.message }

  redirect('/dashboard')
}

export async function signoutAction() {
  const supabase = await createUserClient()
  await supabase.auth.signOut()
  redirect('/login')
}
