import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { authenticateMcpRequest } from './mcp-auth'
import { checkEcosystemAccess, logApiRequest } from './api-auth'

export type MCPToolResult = CallToolResult

export interface ToolDefinition {
  name: string
  description: string
  inputSchema: {
    type: 'object'
    properties: Record<string, { type: string; description: string }>
    required: string[]
  }
}

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: 'get_best_practices',
    description:
      'Get AI-verified best practices for a given AI ecosystem and category. Returns current, production-ready guidance for developers.',
    inputSchema: {
      type: 'object',
      properties: {
        ecosystem: {
          type: 'string',
          description: 'AI ecosystem slug. One of: claude, openai, gemini, langchain, ollama',
        },
        category: {
          type: 'string',
          description: 'Content category. Defaults to best_practices',
        },
      },
      required: ['ecosystem'],
    },
  },
  {
    name: 'get_latest_news',
    description:
      'Get the latest news and updates for an AI ecosystem. Pro tier receives real-time results. Free tier receives items older than 24 hours.',
    inputSchema: {
      type: 'object',
      properties: {
        ecosystem: { type: 'string', description: 'AI ecosystem slug' },
        limit: {
          type: 'number',
          description: 'Number of results to return. Default 5, max 20',
        },
      },
      required: ['ecosystem'],
    },
  },
  {
    name: 'get_top_integrations',
    description:
      'Get ranked integrations and MCP servers for an AI ecosystem. Optionally filter by use case.',
    inputSchema: {
      type: 'object',
      properties: {
        ecosystem: { type: 'string', description: 'AI ecosystem slug' },
        use_case: {
          type: 'string',
          description: 'Filter by use case e.g. coding, research, data analysis',
        },
      },
      required: ['ecosystem'],
    },
  },
  {
    name: 'search_ecosystem',
    description:
      'Search across all verified AI ecosystem content. Returns results ranked by relevance. Leave ecosystem blank to search across all ecosystems.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        ecosystem: {
          type: 'string',
          description:
            'Filter to a specific ecosystem slug. Omit to search all ecosystems',
        },
      },
      required: ['query'],
    },
  },
]

export async function handleToolCall(
  name: string,
  args: Record<string, unknown>,
  req: Request,
): Promise<MCPToolResult> {
  const auth = await authenticateMcpRequest(req)
  if (!auth.ok) {
    return { content: [{ type: 'text', text: 'Error: Invalid API key' }], isError: true }
  }

  const { profile, supabase } = auth

  const err = (msg: string): MCPToolResult => ({
    content: [{ type: 'text', text: msg }],
    isError: true,
  })

  const ok = (data: unknown): MCPToolResult => ({
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
  })

  if (name === 'get_best_practices') {
    const ecosystem = args.ecosystem as string
    const category = (args.category as string | undefined) ?? 'best_practices'

    const access = await checkEcosystemAccess(supabase, ecosystem, profile.tier)
    if (!access.ok) {
      await logApiRequest(supabase, {
        apiKey: profile.api_key,
        tool: 'best-practices',
        ecosystem,
        statusCode: access.response.status,
      })
      return err(
        'Error: Ecosystem not available on free tier. Upgrade at strata.dev/dashboard/billing',
      )
    }

    let query = supabase
      .from('content_items')
      .select('id, title, body, created_at')
      .eq('ecosystem_slug', ecosystem)
      .eq('category', category)
      .order('published_at', { ascending: false })

    if (profile.tier === 'free') query = query.eq('is_pro_only', false)

    const { data, error } = await query
    if (error) {
      await logApiRequest(supabase, {
        apiKey: profile.api_key,
        tool: 'best-practices',
        ecosystem,
        statusCode: 500,
      })
      return err('Error: Database error')
    }

    const items = (data ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      body: row.body,
      updated_at: row.created_at,
    }))
    await logApiRequest(supabase, {
      apiKey: profile.api_key,
      tool: 'best-practices',
      ecosystem,
      statusCode: 200,
    })
    return ok({ ecosystem, category, items })
  }

  if (name === 'get_latest_news') {
    const ecosystem = args.ecosystem as string
    const rawLimit = typeof args.limit === 'number' ? args.limit : 5
    const limit = Math.min(Math.max(1, rawLimit), 20)

    const access = await checkEcosystemAccess(supabase, ecosystem, profile.tier)
    if (!access.ok) {
      await logApiRequest(supabase, {
        apiKey: profile.api_key,
        tool: 'news',
        ecosystem,
        statusCode: access.response.status,
      })
      return err(
        'Error: Ecosystem not available on free tier. Upgrade at strata.dev/dashboard/billing',
      )
    }

    let query = supabase
      .from('content_items')
      .select('id, title, body, source_url, published_at')
      .eq('ecosystem_slug', ecosystem)
      .eq('category', 'news')
      .order('published_at', { ascending: false })
      .limit(limit)

    if (profile.tier === 'free') {
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      query = query.lt('published_at', cutoff).eq('is_pro_only', false)
    }

    const { data, error } = await query
    if (error) {
      await logApiRequest(supabase, {
        apiKey: profile.api_key,
        tool: 'news',
        ecosystem,
        statusCode: 500,
      })
      return err('Error: Database error')
    }

    await logApiRequest(supabase, {
      apiKey: profile.api_key,
      tool: 'news',
      ecosystem,
      statusCode: 200,
    })
    return ok({ ecosystem, tier: profile.tier, items: data ?? [] })
  }

  if (name === 'get_top_integrations') {
    const ecosystem = args.ecosystem as string
    const useCase = args.use_case as string | undefined

    const access = await checkEcosystemAccess(supabase, ecosystem, profile.tier)
    if (!access.ok) {
      await logApiRequest(supabase, {
        apiKey: profile.api_key,
        tool: 'integrations',
        ecosystem,
        statusCode: access.response.status,
      })
      return err(
        'Error: Ecosystem not available on free tier. Upgrade at strata.dev/dashboard/billing',
      )
    }

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
          tool: 'integrations',
          ecosystem,
          statusCode: 500,
        })
        return err('Error: Search error')
      }
      const items = (
        (data ?? []) as Array<{ id: string; title: string; body: string; rank: number }>
      ).map((r) => ({ id: r.id, title: r.title, body: r.body, rank: r.rank }))
      await logApiRequest(supabase, {
        apiKey: profile.api_key,
        tool: 'integrations',
        ecosystem,
        statusCode: 200,
      })
      return ok({ ecosystem, items })
    }

    let query = supabase
      .from('content_items')
      .select('id, title, body')
      .eq('ecosystem_slug', ecosystem)
      .eq('category', 'integrations')
      .order('published_at', { ascending: false })

    if (profile.tier === 'free') query = query.eq('is_pro_only', false)

    const { data, error } = await query
    if (error) {
      await logApiRequest(supabase, {
        apiKey: profile.api_key,
        tool: 'integrations',
        ecosystem,
        statusCode: 500,
      })
      return err('Error: Database error')
    }

    const items = (
      (data ?? []) as Array<{ id: string; title: string; body: string }>
    ).map((r) => ({ id: r.id, title: r.title, body: r.body }))
    await logApiRequest(supabase, {
      apiKey: profile.api_key,
      tool: 'integrations',
      ecosystem,
      statusCode: 200,
    })
    return ok({ ecosystem, items })
  }

  if (name === 'search_ecosystem') {
    const query = args.query as string
    const ecosystem = args.ecosystem as string | undefined
    const logEcosystem = ecosystem ?? 'all'

    if (ecosystem) {
      const access = await checkEcosystemAccess(supabase, ecosystem, profile.tier)
      if (!access.ok) {
        await logApiRequest(supabase, {
          apiKey: profile.api_key,
          tool: 'search',
          ecosystem: logEcosystem,
          statusCode: access.response.status,
        })
        return err(
          'Error: Ecosystem not available on free tier. Upgrade at strata.dev/dashboard/billing',
        )
      }
    }

    const { data, error } = await supabase.rpc('search_content_items', {
      search_query: query,
      filter_ecosystem: ecosystem ?? null,
      filter_category: null,
      user_tier: profile.tier,
    })

    if (error) {
      await logApiRequest(supabase, {
        apiKey: profile.api_key,
        tool: 'search',
        ecosystem: logEcosystem,
        statusCode: 500,
      })
      return err('Error: Search error')
    }

    const results = (
      (data ?? []) as Array<{
        id: string
        title: string
        body: string
        category: string
        ecosystem_slug: string
        source_url: string | null
      }>
    ).map((r) => ({
      id: r.id,
      title: r.title,
      body: r.body,
      category: r.category,
      ecosystem_slug: r.ecosystem_slug,
      source_url: r.source_url,
    }))

    await logApiRequest(supabase, {
      apiKey: profile.api_key,
      tool: 'search',
      ecosystem: logEcosystem,
      statusCode: 200,
    })
    return ok({ query, results })
  }

  return err(`Error: Unknown tool: ${name}`)
}
