import { type NextRequest } from 'next/server'
import {
  authenticateRequest,
  checkEcosystemAccess,
  logApiRequest,
} from '@/lib/api-auth'

const TOOL = 'news'
const DEFAULT_LIMIT = 5
const MAX_LIMIT = 20
const FREE_TIER_DELAY_MS = 24 * 60 * 60 * 1000

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request)
  if (!auth.ok) return auth.response

  const { profile, supabase } = auth
  const params = request.nextUrl.searchParams
  const ecosystem = params.get('ecosystem')
  const limit = parseLimit(params.get('limit'))

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
    .select('id, title, body, source_url, published_at')
    .eq('ecosystem_slug', access.slug)
    .eq('category', 'news')
    .order('published_at', { ascending: false })
    .limit(limit)

  if (profile.tier === 'free') {
    const cutoff = new Date(Date.now() - FREE_TIER_DELAY_MS).toISOString()
    query = query.lt('published_at', cutoff).eq('is_pro_only', false)
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

  await logApiRequest(supabase, {
    apiKey: profile.api_key,
    tool: TOOL,
    ecosystem,
    statusCode: 200,
  })

  return Response.json({ ecosystem, tier: profile.tier, items: data ?? [] })
}

function parseLimit(raw: string | null): number {
  if (!raw) return DEFAULT_LIMIT
  const n = Number.parseInt(raw, 10)
  if (Number.isNaN(n) || n < 1) return DEFAULT_LIMIT
  return Math.min(n, MAX_LIMIT)
}
