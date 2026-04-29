import { type NextRequest } from 'next/server'
import {
  authenticateRequest,
  checkEcosystemAccess,
  logApiRequest,
} from '@/lib/api-auth'

const TOOL = 'best-practices'

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request)
  if (!auth.ok) return auth.response

  const { profile, supabase } = auth
  const params = request.nextUrl.searchParams
  const ecosystem = params.get('ecosystem')
  const category = params.get('category') ?? 'best_practices'

  if (!ecosystem) {
    return Response.json(
      { error: 'ecosystem query param is required' },
      { status: 400 },
    )
  }

  const access = await checkEcosystemAccess(supabase, ecosystem, profile.tier)
  if (!access.ok) {
    await logApiRequest(supabase, {
      apiKey: profile.api_key,
      tool: TOOL,
      ecosystem,
      statusCode: access.response.status,
    })
    return access.response
  }

  let query = supabase
    .from('content_items')
    .select('id, title, body, created_at')
    .eq('ecosystem_slug', access.slug)
    .eq('category', category)
    .order('published_at', { ascending: false })

  if (profile.tier === 'free') {
    query = query.eq('is_pro_only', false)
  }

  const { data, error } = await query
  if (error) {
    await logApiRequest(supabase, {
      apiKey: profile.api_key,
      tool: TOOL,
      ecosystem,
      statusCode: 500,
    })
    return Response.json({ error: 'Database error' }, { status: 500 })
  }

  const items = (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    body: row.body,
    updated_at: row.created_at,
  }))

  await logApiRequest(supabase, {
    apiKey: profile.api_key,
    tool: TOOL,
    ecosystem,
    statusCode: 200,
  })

  return Response.json({ ecosystem, category, items })
}
