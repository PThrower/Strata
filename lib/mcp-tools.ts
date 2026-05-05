import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { authenticateMcpRequest } from './mcp-auth'
import { checkEcosystemAccess, logApiRequest, logQueryAudit } from './api-auth'
import { embed } from './embeddings'
import { freshnessEnvelope } from './freshness'

export type MCPToolResult = CallToolResult

export interface ToolDefinition {
  name: string
  description: string
  inputSchema: {
    type: 'object'
    properties: Record<string, {
      type: string
      description: string
      items?: { type: string }
    }>
    required: string[]
  }
}

const EPISTEMIC_NOTICE =
  'Strata provides intelligence, not ground truth. Always verify critical decisions against the source_urls returned with each item.'

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: 'get_best_practices',
    description:
      'Get AI-verified best practices for an AI ecosystem. Each result includes: title, body, source_urls[], confidence, content_age_hours, data_freshness. Results ordered by recency. Check data_freshness before acting on time-sensitive guidance. ' +
      EPISTEMIC_NOTICE,
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
      'Get the latest news for an AI ecosystem. Pro tier: real-time results. Free tier: items older than 24h. Each result includes: title, body, published_at, source_urls[], content_age_hours, data_freshness. ' +
      EPISTEMIC_NOTICE,
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
      'Get integrations and MCP servers for an AI ecosystem. Without use_case: returns all integrations ordered by recency. With use_case: returns results ranked by full-text relevance. Each result includes: title, body, source_urls[]; when use_case is provided, also includes rank (relevance position). Quarantined items are never returned. Example: get_top_integrations(ecosystem="claude", use_case="code review") finds tools Claude users use for code review. ' +
      EPISTEMIC_NOTICE,
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
      'Full-text search across verified AI ecosystem content: best practices, news, and integrations. Each result includes: title, body, category, ecosystem_slug, source_urls[], ranked by relevance. Omit ecosystem to search all accessible ecosystems. Use this to search ecosystem guidance and news; use find_mcp_servers to search the MCP server directory by capability. ' +
      EPISTEMIC_NOTICE,
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
      'List all AI ecosystems available on your current tier. Returns your_tier and an ecosystems array with slug, name, and vendor per entry. Call this first to get valid slugs before using get_best_practices, get_latest_news, get_top_integrations, or search_ecosystem.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'find_mcp_servers',
    description:
      'Search 2,100+ MCP servers by use case or keyword using semantic similarity weighted by trust scores. Each result includes: security_score (0–100, repo health), runtime_score (0–100, tool behavior analysis), capability_flags (e.g. "shell_exec", "fs_write", "dynamic_eval"), hosted_endpoint, tool_count, runtime_freshness (fresh/aging/stale/unknown). Use exclude_capability_flags to filter dangerous capabilities; use require_hosted for servers with live endpoints. Quarantined and archived servers are always excluded. ' +
      EPISTEMIC_NOTICE,
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Use case or keyword to search for, e.g. "browser automation", "database", "GitHub"',
        },
        category: {
          type: 'string',
          description: 'Optional category filter, e.g. "Browser Automation", "Databases", "Developer Tools"',
        },
        limit: {
          type: 'number',
          description: 'Number of results to return. Default 5, max 20',
        },
        min_security_score: {
          type: 'number',
          description: 'Minimum security score (0–100). Default 30. Pass 0 to include all servers including abandoned ones.',
        },
        min_runtime_score: {
          type: 'number',
          description: 'Minimum runtime score (0–100). Default 0. Pass e.g. 50 to require behaviorally-trusted servers.',
        },
        exclude_capability_flags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Capability flags to exclude. Common values: "shell_exec", "dynamic_eval", "arbitrary_sql", "fs_write", "secret_read", "process_spawn", "net_egress".',
        },
        require_hosted: {
          type: 'boolean',
          description: 'If true, only return servers with a discovered live hosted endpoint. Default false.',
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
  const t0 = Date.now()
  const clientIp = (req.headers as Headers).get('x-forwarded-for')?.split(',')[0]?.trim() ?? null

  const auth = await authenticateMcpRequest(req)
  if (!auth.ok) {
    return { content: [{ type: 'text', text: 'Error: Invalid API key' }], isError: true }
  }

  const { profile, supabase } = auth

  const err = (msg: string, statusCode = 400): MCPToolResult => {
    void logQueryAudit(supabase, {
      apiKey: profile.api_key, tool: name, queryParams: args,
      statusCode, clientIp, latencyMs: Date.now() - t0,
    })
    return { content: [{ type: 'text', text: msg }], isError: true }
  }

  const ok = (data: unknown, ids: string[] = []): MCPToolResult => {
    void logQueryAudit(supabase, {
      apiKey: profile.api_key, tool: name, queryParams: args,
      resultIds: ids, resultCount: ids.length,
      statusCode: 200, clientIp, latencyMs: Date.now() - t0,
    })
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] }
  }

  if (name === 'get_best_practices') {
    const ecosystem = args.ecosystem as string
    const category = (args.category as string | undefined) ?? 'best_practices'

    const access = await checkEcosystemAccess(supabase, ecosystem, profile.tier)
    if (!access.ok) {
      await logApiRequest(supabase, { apiKey: profile.api_key, tool: 'best-practices', ecosystem, statusCode: access.response.status })
      return err('Error: Ecosystem not available on free tier. Upgrade at usestrata.dev/dashboard/billing', access.response.status)
    }

    let query = supabase
      .from('content_items')
      .select('id, title, body, source_url, published_at, last_verified_at, confidence, source_count, created_at')
      .eq('ecosystem_slug', access.slug)
      .eq('category', category)
      .eq('is_quarantined', false)
      .order('published_at', { ascending: false })

    if (profile.tier === 'free') query = query.eq('is_pro_only', false)

    const { data, error } = await query
    if (error) {
      await logApiRequest(supabase, { apiKey: profile.api_key, tool: 'best-practices', ecosystem, statusCode: 500 })
      return err('Error: Database error', 500)
    }

    type Row = { id: string; title: string; body: string; source_url: string | null; published_at: string; last_verified_at: string | null; confidence: string | null; source_count: number | null; created_at: string }
    const rows = (data ?? []) as Row[]
    const items = rows.map((row) => ({
      id: row.id,
      title: row.title,
      body: row.body,
      source_urls: row.source_url ? [row.source_url] : [],
      confidence: row.confidence ?? 'medium',
      source_count: row.source_count ?? 1,
      updated_at: row.created_at,
      ...freshnessEnvelope(row.published_at ?? row.created_at, row.last_verified_at),
    }))

    await logApiRequest(supabase, { apiKey: profile.api_key, tool: 'best-practices', ecosystem, statusCode: 200 })
    return ok({ ecosystem, category, items }, rows.map(r => r.id))
  }

  if (name === 'get_latest_news') {
    const ecosystem = args.ecosystem as string
    const rawLimit = typeof args.limit === 'number' ? args.limit : 5
    const limit = Math.min(Math.max(1, rawLimit), 20)

    const access = await checkEcosystemAccess(supabase, ecosystem, profile.tier)
    if (!access.ok) {
      await logApiRequest(supabase, { apiKey: profile.api_key, tool: 'news', ecosystem, statusCode: access.response.status })
      return err('Error: Ecosystem not available on free tier. Upgrade at usestrata.dev/dashboard/billing', access.response.status)
    }

    let query = supabase
      .from('content_items')
      .select('id, title, body, source_url, published_at, last_verified_at, confidence, source_count')
      .eq('ecosystem_slug', access.slug)
      .eq('category', 'news')
      .eq('is_quarantined', false)
      .order('published_at', { ascending: false })
      .limit(limit)

    if (profile.tier === 'free') {
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      query = query.lt('published_at', cutoff).eq('is_pro_only', false)
    }

    const { data, error } = await query
    if (error) {
      await logApiRequest(supabase, { apiKey: profile.api_key, tool: 'news', ecosystem, statusCode: 500 })
      return err('Error: Database error', 500)
    }

    type Row = { id: string; title: string; body: string; source_url: string | null; published_at: string; last_verified_at: string | null; confidence: string | null; source_count: number | null }
    const rows = (data ?? []) as Row[]
    const items = rows.map((row) => ({
      id: row.id,
      title: row.title,
      body: row.body,
      source_urls: row.source_url ? [row.source_url] : [],
      confidence: row.confidence ?? 'medium',
      source_count: row.source_count ?? 1,
      published_at: row.published_at,
      ...freshnessEnvelope(row.published_at, row.last_verified_at),
    }))

    await logApiRequest(supabase, { apiKey: profile.api_key, tool: 'news', ecosystem, statusCode: 200 })
    return ok({ ecosystem, tier: profile.tier, items }, rows.map(r => r.id))
  }

  if (name === 'get_top_integrations') {
    const ecosystem = args.ecosystem as string
    const useCase = args.use_case as string | undefined

    const access = await checkEcosystemAccess(supabase, ecosystem, profile.tier)
    if (!access.ok) {
      await logApiRequest(supabase, { apiKey: profile.api_key, tool: 'integrations', ecosystem, statusCode: access.response.status })
      return err('Error: Ecosystem not available on free tier. Upgrade at usestrata.dev/dashboard/billing', access.response.status)
    }

    if (useCase) {
      const { data, error } = await supabase.rpc('search_content_items', {
        search_query: useCase,
        filter_ecosystem: access.slug,
        filter_category: 'integrations',
        user_tier: profile.tier,
      })
      if (error) {
        await logApiRequest(supabase, { apiKey: profile.api_key, tool: 'integrations', ecosystem, statusCode: 500 })
        return err('Error: Search error', 500)
      }
      type SearchRow = { id: string; title: string; body: string; source_url: string | null; rank: number }
      const rows = ((data ?? []) as SearchRow[])
      const items = rows.map((r) => ({
        id: r.id, title: r.title, body: r.body,
        source_urls: r.source_url ? [r.source_url] : [],
        rank: r.rank,
      }))
      await logApiRequest(supabase, { apiKey: profile.api_key, tool: 'integrations', ecosystem, statusCode: 200 })
      return ok({ ecosystem, items }, rows.map(r => r.id))
    }

    let query = supabase
      .from('content_items')
      .select('id, title, body, source_url')
      .eq('ecosystem_slug', access.slug)
      .eq('category', 'integrations')
      .eq('is_quarantined', false)
      .order('published_at', { ascending: false })

    if (profile.tier === 'free') query = query.eq('is_pro_only', false)

    const { data, error } = await query
    if (error) {
      await logApiRequest(supabase, { apiKey: profile.api_key, tool: 'integrations', ecosystem, statusCode: 500 })
      return err('Error: Database error', 500)
    }

    type Row = { id: string; title: string; body: string; source_url: string | null }
    const rows = ((data ?? []) as Row[])
    const items = rows.map((r) => ({
      id: r.id, title: r.title, body: r.body,
      source_urls: r.source_url ? [r.source_url] : [],
    }))
    await logApiRequest(supabase, { apiKey: profile.api_key, tool: 'integrations', ecosystem, statusCode: 200 })
    return ok({ ecosystem, items }, rows.map(r => r.id))
  }

  if (name === 'search_ecosystem') {
    const query = (args.query as string).slice(0, 2000)
    const ecosystem = args.ecosystem as string | undefined
    const logEcosystem = ecosystem ?? 'all'

    let resolvedEcosystem: string | null = null
    if (ecosystem) {
      const access = await checkEcosystemAccess(supabase, ecosystem, profile.tier)
      if (!access.ok) {
        await logApiRequest(supabase, { apiKey: profile.api_key, tool: 'search', ecosystem: logEcosystem, statusCode: access.response.status })
        return err('Error: Ecosystem not available on free tier. Upgrade at usestrata.dev/dashboard/billing', access.response.status)
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
      await logApiRequest(supabase, { apiKey: profile.api_key, tool: 'search', ecosystem: logEcosystem, statusCode: 500 })
      return err('Error: Search error', 500)
    }

    type SearchRow = { id: string; title: string; body: string; category: string; ecosystem_slug: string; source_url: string | null }
    const rows = ((data ?? []) as SearchRow[])
    const results = rows.map((r) => ({
      id: r.id, title: r.title, body: r.body,
      category: r.category, ecosystem_slug: r.ecosystem_slug,
      source_urls: r.source_url ? [r.source_url] : [],
    }))

    await logApiRequest(supabase, { apiKey: profile.api_key, tool: 'search', ecosystem: logEcosystem, statusCode: 200 })
    return ok({ query, results }, rows.map(r => r.id))
  }

  if (name === 'list_ecosystems') {
    const { data, error } = await supabase
      .from('ecosystems')
      .select('slug, name, vendor, available_on_free')
      .eq('status', 'live')
      .order('name')

    if (error) return err('Error: Database error', 500)

    const all = (data ?? []) as Array<{ slug: string; name: string; vendor: string; available_on_free: boolean }>
    const ecosystems = profile.tier === 'pro'
      ? all.map(e => ({ slug: e.slug, name: e.name, vendor: e.vendor, tier: 'pro' as const }))
      : all
          .filter(e => e.available_on_free)
          .map(e => ({ slug: e.slug, name: e.name, vendor: e.vendor, tier: 'free' as const }))

    await logApiRequest(supabase, { apiKey: profile.api_key, tool: 'list-ecosystems', ecosystem: 'all', statusCode: 200 })
    return ok({ your_tier: profile.tier, ecosystems })
  }

  if (name === 'find_mcp_servers') {
    const query = (args.query as string).slice(0, 2000)
    const category = args.category as string | undefined
    const rawLimit = typeof args.limit === 'number' ? args.limit : 5
    const limit = Math.min(Math.max(1, rawLimit), 20)
    const rawMinScore = typeof args.min_security_score === 'number' ? args.min_security_score : 30
    const minSecurityScore = Math.min(100, Math.max(0, rawMinScore))
    const rawMinRuntime = typeof args.min_runtime_score === 'number' ? args.min_runtime_score : 0
    const minRuntimeScore = Math.min(100, Math.max(0, rawMinRuntime))
    const excludeFlags = Array.isArray(args.exclude_capability_flags)
      ? (args.exclude_capability_flags as unknown[]).filter((f): f is string => typeof f === 'string').slice(0, 20)
      : []
    const requireHosted = args.require_hosted === true

    let embedding: number[]
    try {
      embedding = await embed(query)
    } catch {
      await logApiRequest(supabase, { apiKey: profile.api_key, tool: 'mcp-servers', ecosystem: 'mcp', statusCode: 500 })
      return err('Error: Embedding error', 500)
    }

    const { data, error } = await supabase.rpc('search_mcp_servers', {
      query_embedding: embedding,
      filter_category: category ?? null,
      match_count: limit,
      min_security_score: minSecurityScore,
      min_runtime_score: minRuntimeScore,
      exclude_capability_flags: excludeFlags,
      require_hosted: requireHosted,
    })

    if (error) {
      await logApiRequest(supabase, { apiKey: profile.api_key, tool: 'mcp-servers', ecosystem: 'mcp', statusCode: 500 })
      return err('Error: Search error', 500)
    }

    type McpRow = {
      id: string; name: string; description: string | null; url: string | null
      category: string | null; tags: string[]; similarity: number
      security_score: number | null; runtime_score: number | null
      capability_flags: string[] | null; hosted_endpoint: string | null
      tool_count: number | null; stars: number | null; archived: boolean | null
      runtime_updated_at: string | null
    }
    const rows = ((data ?? []) as McpRow[])
    const now = Date.now()
    const freshness = (iso: string | null): 'fresh' | 'aging' | 'stale' | 'unknown' => {
      if (!iso) return 'unknown'
      const days = (now - new Date(iso).getTime()) / 86_400_000
      if (days < 14) return 'fresh'
      if (days < 60) return 'aging'
      return 'stale'
    }
    const results = rows.map((r) => ({
      name: r.name,
      description: r.description,
      url: r.url,
      category: r.category,
      similarity: Math.round(r.similarity * 1000) / 1000,
      security_score: r.security_score,
      runtime_score: r.runtime_score,
      capability_flags: r.capability_flags ?? [],
      hosted_endpoint: r.hosted_endpoint,
      tool_count: r.tool_count,
      stars: r.stars,
      runtime_freshness: freshness(r.runtime_updated_at),
    }))

    await logApiRequest(supabase, { apiKey: profile.api_key, tool: 'mcp-servers', ecosystem: 'mcp', statusCode: 200 })
    return ok({ query, results }, rows.map(r => r.id))
  }

  return err(`Error: Unknown tool: ${name}`, 400)
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
