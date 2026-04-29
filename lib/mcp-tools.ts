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
          description: 'AI ecosystem slug. Call list_ecosystems first to see all available slugs for your tier.',
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
  {
    name: 'list_ecosystems',
    description:
      'List all AI ecosystems available on your current tier. Call this first to discover valid ecosystem slugs before calling get_best_practices, get_latest_news, or get_top_integrations.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
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
      .eq('ecosystem_slug', access.slug)
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
      .eq('ecosystem_slug', access.slug)
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
        filter_ecosystem: access.slug,
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
      .eq('ecosystem_slug', access.slug)
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

    let resolvedEcosystem: string | null = null
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
      resolvedEcosystem = access.slug
    }

    const { data, error } = await supabase.rpc('search_content_items', {
      search_query: query,
      filter_ecosystem: resolvedEcosystem,
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

  if (name === 'list_ecosystems') {
    const { data, error } = await supabase
      .from('ecosystems')
      .select('slug, name, vendor, available_on_free')
      .eq('status', 'live')
      .order('name')

    if (error) return err('Error: Database error')

    const all = (data ?? []) as Array<{
      slug: string; name: string; vendor: string; available_on_free: boolean
    }>

    const ecosystems = profile.tier === 'pro'
      ? all.map(e => ({ slug: e.slug, name: e.name, vendor: e.vendor, tier: 'pro' as const }))
      : all
          .filter(e => e.available_on_free)
          .map(e => ({ slug: e.slug, name: e.name, vendor: e.vendor, tier: 'free' as const }))

    await logApiRequest(supabase, {
      apiKey: profile.api_key,
      tool: 'list-ecosystems',
      ecosystem: 'all',
      statusCode: 200,
    })

    return ok({ your_tier: profile.tier, ecosystems })
  }

  return err(`Error: Unknown tool: ${name}`)
}

export const RESOURCES = [
  {
    uri: 'strata://formatting-guide',
    name: 'Strata Formatting Guide',
    description: 'Instructions for presenting Strata intelligence results',
    mimeType: 'text/plain',
    text: `STRATA INTELLIGENCE FORMATTING GUIDE

When presenting results from Strata MCP tools, always format
output as a structured intelligence briefing. Follow these rules:

STRUCTURE
Use this layout for any Strata response:

─────────────────────────────────────────
STRATA INTELLIGENCE BRIEF
[Ecosystem] · [Category] · [Date]
─────────────────────────────────────────

[SECTION HEADING]
- [Item 1 — punchy one-line summary]
- [Item 2 — punchy one-line summary]
- [Item 3 — punchy one-line summary]

TL;DR
[2-3 sentence synthesis of the most important takeaway]
─────────────────────────────────────────
Powered by Strata · usestrata.dev
─────────────────────────────────────────

SECTION HEADINGS BY CATEGORY
- best_practices  → "BEST PRACTICES"
- news            → "WHAT JUST SHIPPED"
- integrations    → "TOP INTEGRATIONS"
- search results  → "RELEVANT RESULTS"

MULTI-TOOL BRIEFINGS
When multiple tools are called, combine into one briefing
with a section per tool call. Add a SIGNAL OF THE WEEK
section at the end with the single most important insight.

TONE
- Punchy and dense — every line earns its place
- Write for a senior developer, not a beginner
- Lead with the most surprising or actionable item
- Never use filler phrases like "In conclusion" or "Overall"`,
  },
]

export const PROMPTS = [
  {
    name: 'ecosystem_briefing',
    description: 'Generate a structured intelligence briefing for any AI ecosystem using Strata tools',
    arguments: [
      {
        name: 'ecosystem',
        description: 'The ecosystem to brief on: claude, openai, gemini, langchain, ollama, cursor, groq, etc.',
        required: true,
      },
    ],
    template: `You are an AI intelligence analyst using the Strata MCP server.

Generate a complete intelligence briefing for the {ecosystem} ecosystem.

Steps:
1. Call get_best_practices(ecosystem="{ecosystem}")
2. Call get_latest_news(ecosystem="{ecosystem}")
3. Call get_top_integrations(ecosystem="{ecosystem}")
4. Synthesize all results into a structured briefing

Format the output exactly like this:

─────────────────────────────────────────
STRATA INTELLIGENCE BRIEF
{ecosystem} · [Date]
─────────────────────────────────────────

WHAT JUST SHIPPED
[3 bullet points from news — most recent first]

BEST PRACTICES RIGHT NOW
[3 bullet points — most actionable first]

TOP INTEGRATIONS
[3 bullet points — most relevant first]

SIGNAL OF THE WEEK
[1 paragraph — the single most important thing a developer
building with {ecosystem} should know right now]
─────────────────────────────────────────
Powered by Strata · usestrata.dev
─────────────────────────────────────────

Be punchy. Every line should earn its place.
Write for a senior developer who has 60 seconds to read this.`,
  },
  {
    name: 'cross_ecosystem_compare',
    description: 'Compare two AI ecosystems side by side using Strata intelligence',
    arguments: [
      {
        name: 'ecosystem_a',
        description: 'First ecosystem to compare',
        required: true,
      },
      {
        name: 'ecosystem_b',
        description: 'Second ecosystem to compare',
        required: true,
      },
    ],
    template: `You are an AI intelligence analyst using the Strata MCP server.

Compare {ecosystem_a} and {ecosystem_b} for a developer
deciding between them or integrating both.

Steps:
1. Call get_best_practices(ecosystem="{ecosystem_a}")
2. Call get_best_practices(ecosystem="{ecosystem_b}")
3. Call get_latest_news(ecosystem="{ecosystem_a}")
4. Call get_latest_news(ecosystem="{ecosystem_b}")

Format output as:

─────────────────────────────────────────
STRATA COMPARISON BRIEF
{ecosystem_a} vs {ecosystem_b} · [Today's Date]
─────────────────────────────────────────

{ecosystem_a} STRENGTHS
[3 bullet points]

{ecosystem_b} STRENGTHS
[3 bullet points]

WHERE THEY OVERLAP
[2-3 bullet points]

RECENT MOMENTUM
[Which ecosystem has more activity right now and why]

VERDICT
[When to use {ecosystem_a}, when to use {ecosystem_b},
when to use both]
─────────────────────────────────────────
Powered by Strata · usestrata.dev
─────────────────────────────────────────`,
  },
  {
    name: 'agent_stack_review',
    description: 'Stack recommendation for a specific use case based on current Strata intelligence',
    arguments: [
      {
        name: 'use_case',
        description: 'What you are building e.g. "RAG pipeline", "coding assistant", "data analysis agent"',
        required: true,
      },
    ],
    template: `You are a senior AI architect using the Strata MCP server.

A developer is building: {use_case}

Research the most relevant ecosystems for this use case
and recommend a stack.

Steps:
1. Use search_ecosystem(query="{use_case}") to find relevant content
2. Call get_best_practices for the 2-3 most relevant ecosystems
3. Call get_top_integrations for the primary ecosystem

Format output as:

─────────────────────────────────────────
STRATA STACK RECOMMENDATION
For: {use_case} · [Today's Date]
─────────────────────────────────────────

RECOMMENDED STACK
[Primary tool/framework — one line why]
[Secondary tool — one line why]

INTEGRATIONS TO KNOW
[2-3 integrations most relevant to this use case]

WHAT TO AVOID
[1-2 common mistakes for this use case based on the data]
─────────────────────────────────────────
Powered by Strata · usestrata.dev
─────────────────────────────────────────`,
  },
]
