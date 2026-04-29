'use server'

import { createUserClient, createServiceRoleClient } from '@/lib/supabase-server'

export type SuggestionState = { error?: string; success?: boolean } | undefined

export async function submitSuggestionAction(
  _prev: SuggestionState,
  formData: FormData,
): Promise<SuggestionState> {
  const content = (formData.get('content') as string | null)?.trim() ?? ''

  if (content.length < 10) return { error: 'Suggestion must be at least 10 characters.' }
  if (content.length > 500) return { error: 'Suggestion must be 500 characters or fewer.' }

  const userClient = await createUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const supabase = createServiceRoleClient()
  const { error } = await supabase.from('suggestions').insert({ user_id: user.id, content })

  if (error) return { error: 'Something went wrong. Try again.' }
  return { success: true }
}
