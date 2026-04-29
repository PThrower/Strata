import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import { z } from 'zod'
import { TOOL_DEFINITIONS, handleToolCall } from '@/lib/mcp-tools'

export const dynamic = 'force-dynamic'

export async function GET() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  return Response.json({
    name: 'Strata MCP',
    description:
      'AI ecosystem intelligence for agents. Best practices, news, integrations, and search across Claude, ChatGPT, Gemini, LangChain, and Ollama.',
    version: '1.0.0',
    tools: TOOL_DEFINITIONS.map((t) => ({ name: t.name, description: t.description })),
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
      inputSchema: { ecosystem: z.string(), category: z.string().optional() },
    },
    (args) => handleToolCall('get_best_practices', args as Record<string, unknown>, req),
  )

  server.registerTool(
    'get_latest_news',
    {
      description: TOOL_DEFINITIONS[1].description,
      inputSchema: { ecosystem: z.string(), limit: z.number().optional() },
    },
    (args) => handleToolCall('get_latest_news', args as Record<string, unknown>, req),
  )

  server.registerTool(
    'get_top_integrations',
    {
      description: TOOL_DEFINITIONS[2].description,
      inputSchema: { ecosystem: z.string(), use_case: z.string().optional() },
    },
    (args) => handleToolCall('get_top_integrations', args as Record<string, unknown>, req),
  )

  server.registerTool(
    'search_ecosystem',
    {
      description: TOOL_DEFINITIONS[3].description,
      inputSchema: { query: z.string(), ecosystem: z.string().optional() },
    },
    (args) => handleToolCall('search_ecosystem', args as Record<string, unknown>, req),
  )

  const transport = new WebStandardStreamableHTTPServerTransport()
  await server.connect(transport)
  return transport.handleRequest(req)
}
