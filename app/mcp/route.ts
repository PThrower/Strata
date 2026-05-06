import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import { z } from 'zod'
import { TOOL_DEFINITIONS, handleToolCall, RESOURCES, PROMPTS } from '@/lib/mcp-tools'

export const dynamic = 'force-dynamic'

export async function GET() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  return Response.json({
    name: 'Strata MCP',
    description:
      'AI ecosystem intelligence for agents. Best practices, news, integrations, and search across 22+ AI ecosystems. Call list_ecosystems first to discover available slugs for your tier.',
    version: '1.0.0',
    tools: TOOL_DEFINITIONS.map((t) => ({ name: t.name, description: t.description })),
    prompts: PROMPTS.map(p => ({ name: p.name, description: p.description, arguments: p.arguments })),
    resources: RESOURCES.map(r => ({ uri: r.uri, name: r.name, description: r.description })),
    auth: 'Pass your Strata API key as: Authorization: Bearer sk_your_key or X-API-Key: sk_your_key',
    endpoint: `${appUrl}/mcp`,
  })
}

export async function POST(req: Request) {
  const server = new McpServer({ name: 'strata', version: '1.0.0' })

  server.registerTool(
    'get_best_practices',
    {
      description: TOOL_DEFINITIONS[0].description,
      inputSchema: {
        ecosystem: z.string().describe('Required. Ecosystem slug — e.g. "claude", "openai", "langchain". Call list_ecosystems to see all valid slugs for your tier. Returns an error if the slug is invalid or not available on your tier.'),
        category: z.string().optional().describe('Optional. Content category filter. Default: "best_practices". Leave unset to receive standard curated guidance.'),
      },
    },
    (args) => handleToolCall('get_best_practices', args as Record<string, unknown>, req),
  )

  server.registerTool(
    'get_latest_news',
    {
      description: TOOL_DEFINITIONS[1].description,
      inputSchema: {
        ecosystem: z.string().describe('Required. Ecosystem slug — e.g. "claude", "openai", "cursor". Call list_ecosystems to see all valid slugs for your tier. Returns an error if the slug is invalid or not available on your tier.'),
        limit: z.number().optional().describe('Optional. Number of items to return. Default: 5. Accepted range: 1–20. Values outside the range are clamped.'),
      },
    },
    (args) => handleToolCall('get_latest_news', args as Record<string, unknown>, req),
  )

  server.registerTool(
    'get_top_integrations',
    {
      description: TOOL_DEFINITIONS[2].description,
      inputSchema: {
        ecosystem: z.string().describe('Required. Ecosystem slug — e.g. "claude", "cursor", "langchain". Call list_ecosystems to see all valid slugs for your tier. Returns an error if the slug is invalid or not available on your tier.'),
        use_case: z.string().optional().describe('Optional. Filter by use case via full-text search — e.g. "code review", "RAG pipeline", "data analysis". Omit to return all integrations for the ecosystem ordered by recency.'),
      },
    },
    (args) => handleToolCall('get_top_integrations', args as Record<string, unknown>, req),
  )

  server.registerTool(
    'search_ecosystem',
    {
      description: TOOL_DEFINITIONS[3].description,
      inputSchema: {
        query: z.string().describe('Required. Full-text search query across ecosystem content (best practices, news, integrations). Max 2000 characters. Example: "streaming tool calls". Use find_mcp_servers to search the MCP server directory instead.'),
        ecosystem: z.string().optional().describe('Optional. Restrict results to one ecosystem slug — e.g. "openai". Omit to search all accessible ecosystems. Call list_ecosystems to see valid slugs for your tier.'),
      },
    },
    (args) => handleToolCall('search_ecosystem', args as Record<string, unknown>, req),
  )

  server.registerTool(
    'list_ecosystems',
    {
      description: TOOL_DEFINITIONS[4].description,
      inputSchema: {},
    },
    (args) => handleToolCall('list_ecosystems', args as Record<string, unknown>, req),
  )

  server.registerTool(
    'find_mcp_servers',
    {
      description: TOOL_DEFINITIONS[5].description,
      inputSchema: {
        query: z.string().describe('Required. Semantic search query describing the capability or use case — e.g. "browser automation", "database queries", "GitHub integration". Max 2000 characters.'),
        category: z.string().optional().describe('Optional. Category filter — e.g. "Browser Automation", "Databases", "Developer Tools". Omit to search all categories.'),
        limit: z.number().optional().describe('Optional. Number of results. Default: 5. Range: 1–20. Values outside the range are clamped.'),
        min_security_score: z.number().optional().describe('Optional. Minimum security score (0–100) based on repo health signals. Default: 30. Pass 0 to include all servers including abandoned repos.'),
        min_runtime_score: z.number().optional().describe('Optional. Minimum runtime score (0–100) based on tool behavior analysis. Default: 0. Pass 50 or higher to require behaviorally-trusted servers.'),
        exclude_capability_flags: z.array(z.string()).optional().describe('Optional. Exclude servers exposing any of these capabilities. Valid values: "shell_exec", "dynamic_eval", "fs_write", "arbitrary_sql", "secret_read", "process_spawn", "net_egress". Example: ["shell_exec", "dynamic_eval"].'),
        require_hosted: z.boolean().optional().describe('Optional. If true, only return servers with a discovered live hosted endpoint. Default: false.'),
        exclude_circuit_broken: z.boolean().optional().describe('Optional. If true, exclude servers with an active circuit breaker (critical risk event detected). Default: false — circuit-broken servers appear with circuit_broken=true.'),
      },
    },
    (args) => handleToolCall('find_mcp_servers', args as Record<string, unknown>, req),
  )

  server.registerTool(
    'verify_payment_endpoint',
    {
      description: TOOL_DEFINITIONS[6].description,
      inputSchema: {
        url: z.string().describe("The full https:// URL of the payment endpoint to verify. Must return HTTP 402 with x402 payment details. Example: 'https://api.example.com/premium-data'"),
      },
    },
    (args) => handleToolCall('verify_payment_endpoint', args as Record<string, unknown>, req),
  )

  server.registerTool(
    'track_data_flow',
    {
      description: TOOL_DEFINITIONS[7].description,
      inputSchema: {
        source_server: z.string().describe('https:// URL of the server data was READ from.'),
        dest_server: z.string().describe('https:// URL of the server data was SENT to.'),
        session_id: z.string().optional().describe('Optional. Opaque run/trace ID that groups related flows together (e.g. a LangChain run_id or your own UUID). All flows sharing a session_id appear as one agent run in the dashboard.'),
        data_tags: z.array(z.string()).optional().describe("Optional. Classify what kind of data moved. Allowed values: 'pii', 'credentials', 'financial', 'internal'. Raises the risk level when combined with net_egress on the destination."),
        source_tool: z.string().optional().describe('Optional. Name of the tool called on the source server.'),
        dest_tool: z.string().optional().describe('Optional. Name of the tool called on the destination server.'),
      },
    },
    (args) => handleToolCall('track_data_flow', args as Record<string, unknown>, req),
  )

  server.registerTool(
    'verify_agent_credential',
    {
      description: TOOL_DEFINITIONS[8].description,
      inputSchema: {
        credential: z.string().describe('The JWT presented by the agent in its Authorization: Bearer header.'),
      },
    },
    (args) => handleToolCall('verify_agent_credential', args as Record<string, unknown>, req),
  )

  server.registerTool(
    'get_threat_feed',
    {
      description: TOOL_DEFINITIONS[9].description,
      inputSchema: {
        since: z.string().optional().describe('Optional ISO 8601 date. Return events after this timestamp. Default: last 7 days.'),
        affected_only: z.boolean().optional().describe('Optional. If true, return only events for servers you have connected to (based on your activity ledger). Default: false.'),
        severity: z.string().optional().describe("Optional. Filter by severity: 'critical', 'high', 'medium', or 'low'."),
      },
    },
    (args) => handleToolCall('get_threat_feed', args as Record<string, unknown>, req),
  )

  for (const resource of RESOURCES) {
    server.registerResource(
      resource.name,
      resource.uri,
      { description: resource.description, mimeType: resource.mimeType },
      async () => ({
        contents: [{ uri: resource.uri, text: resource.text, mimeType: resource.mimeType }],
      })
    )
  }

  for (const p of PROMPTS) {
    server.registerPrompt(
      p.name,
      {
        description: p.description,
        argsSchema: Object.fromEntries(
          p.arguments.map(arg => [
            arg.name,
            arg.required ? z.string().describe(arg.description) : z.string().optional().describe(arg.description),
          ])
        ),
      },
      (args) => {
        let text = p.template
        for (const [key, value] of Object.entries(args as Record<string, string | undefined>)) {
          text = text.replaceAll(`{${key}}`, String(value ?? ''))
        }
        return {
          messages: [{ role: 'user' as const, content: { type: 'text' as const, text } }],
        }
      }
    )
  }

  const transport = new WebStandardStreamableHTTPServerTransport()
  await server.connect(transport)
  return transport.handleRequest(req)
}
