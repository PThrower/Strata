import { createServiceRoleClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  // Accept the api_key from the request body, Authorization header, or X-API-Key header
  let apiKey: string | null = null

  const authHeader = req.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    apiKey = authHeader.slice(7)
  } else if (req.headers.get('x-api-key')) {
    apiKey = req.headers.get('x-api-key')
  } else {
    try {
      const body = await req.json() as Record<string, unknown>
      if (typeof body?.api_key === 'string') apiKey = body.api_key
    } catch {
      // malformed body — apiKey stays null
    }
  }

  if (!apiKey) {
    return Response.json({ error: 'invalid_client' }, { status: 401 })
  }

  const supabase = createServiceRoleClient()
  const { data } = await supabase
    .from('profiles')
    .select('api_key')
    .eq('api_key', apiKey)
    .maybeSingle<{ api_key: string }>()

  if (!data) {
    return Response.json({ error: 'invalid_client' }, { status: 401 })
  }

  return Response.json({
    access_token: apiKey,
    token_type: 'Bearer',
    expires_in: 2592000,
  })
}
