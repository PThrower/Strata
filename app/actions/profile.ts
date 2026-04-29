'use server'

import { revalidatePath } from 'next/cache'
import { createUserClient, createServiceRoleClient } from '@/lib/supabase-server'

export async function regenerateApiKeyAction(): Promise<{ error?: string }> {
  const supabase = await createUserClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return { error: 'Not authenticated' }

  const newKey = 'sk_' + crypto.randomUUID().replace(/-/g, '').slice(0, 32)

  const serviceClient = createServiceRoleClient()
  const { error } = await serviceClient
    .from('profiles')
    .update({ api_key: newKey })
    .eq('id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  return {}
}
