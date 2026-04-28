import { type NextRequest } from 'next/server'
import {
  authenticateRequest,
  checkEcosystemAccess,
  logApiRequest,
} from '@/lib/api-auth'

const TOOL = 'integrations'

type SearchRow = {
  id: string
  title: string
  body: string
  category: string
  ecosystem_slug: string
  source_url: string | null
  rank: number
}

type ContentRow = {
  id: string
  title: string
  body: string
}

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request)
  if (!auth.ok) return auth.response

  const { profile, supabase } = auth
  const params = request.nextUrl.searchParams
  const ecosystem = params.get('ecosystem')
  const useCase = params.get('use_case')

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

  let items: Array<{ id: string; title: string; body: string; rank?: number }>

  if (useCase) {
    const { data, error } = await supabase.rpc('search_content_items', {
      search_query: useCase,
      filter_ecosystem: ecosystem,
      filter_category: 'integrations',
      user_tier: profile.tier,
    })
    if (error) {
      await logApiRequest(supabase, {
        apiKey: profile.api_key,
        tool: TOOL,
        ecosystem,
        statusCode: 500,
      })
      return Response.json({ error: 'Search error' }, { status: 500 })
    }
    items = ((data ?? []) as SearchRow[]).map((row) => ({
      id: row.id,
      title: row.title,
      body: row.body,
      rank: row.rank,
    }))
  } else {
    let query = supabase
      .from('content_items')
      .select('id, title, body')
      .eq('ecosystem_slug', ecosystem)
      .eq('category', 'integrations')
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
    items = ((data ?? []) as ContentRow[]).map((row) => ({
      id: row.id,
      title: row.title,
      body: row.body,
    }))
  }

  await logApiRequest(supabase, {
    apiKey: profile.api_key,
    tool: TOOL,
    ecosystem,
    statusCode: 200,
  })

  return Response.json({ ecosystem, items })
}
