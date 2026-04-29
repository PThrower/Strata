import { createServiceRoleClient } from './supabase-server'
import { FREE_LIMIT, PRO_LIMIT } from './api-auth'
import type { AuthResult, Profile } from './api-auth'

export async function authenticateMcpRequest(req: Request): Promise<AuthResult> {
  const authHeader = req.headers.get('authorization')
  const apiKey = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : req.headers.get('x-api-key')

  if (!apiKey) return invalidKey()

  const supabase = createServiceRoleClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('api_key', apiKey)
    .maybeSingle<Profile>()

  if (!profile) return invalidKey()

  const now = new Date()
  const resetAt = profile.calls_reset_at ? new Date(profile.calls_reset_at) : null

  if (resetAt === null || resetAt <= now) {
    const newResetAt = new Date(now)
    newResetAt.setMonth(newResetAt.getMonth() + 1)
    await supabase
      .from('profiles')
      .update({ calls_used: 0, calls_reset_at: newResetAt.toISOString() })
      .eq('id', profile.id)
    profile.calls_used = 0
    profile.calls_reset_at = newResetAt.toISOString()
  }

  const limit = profile.tier === 'pro' ? PRO_LIMIT : FREE_LIMIT
  if (profile.calls_used >= limit) {
    return {
      ok: false,
      response: Response.json(
        { error: 'Monthly limit reached', tier: profile.tier },
        { status: 429 },
      ),
    }
  }

  await supabase
    .from('profiles')
    .update({ calls_used: profile.calls_used + 1 })
    .eq('id', profile.id)
  profile.calls_used += 1

  return { ok: true, profile, supabase }
}

function invalidKey(): { ok: false; response: Response } {
  return {
    ok: false,
    response: Response.json({ error: 'Invalid API key' }, { status: 401 }),
  }
}
