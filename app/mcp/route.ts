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
  // OAuth discovery flow: Claude Code sends access_token in the body.
  // Extract it and promote to an Authorization header so existing auth
  // middleware sees a normal Bearer token — without consuming the body
  // that the MCP transport needs to read.
  let effectiveReq = req
  if (!req.headers.get('authorization') && !req.headers.get('x-api-key')) {
    try {
      const body = await req.clone().json() as Record<string, unknown>
      if (typeof body?.access_token === 'string') {
        const headers = new Headers(req.headers)
        headers.set('authorization', `Bearer ${body.access_token}`)
        effectiveReq = new Request(req, { headers })
      }
    } catch {
      // body is not JSON or has no access_token — proceed as normal
    }
  }

  const server = new McpServer({ name: 'strata', version: '1.0.0' })

  server.registerTool(
    'get_best_practices',
    {
      description: TOOL_DEFINITIONS[0].description,
      inputSchema: { ecosystem: z.string(), category: z.string().optional() },
    },
    (args) => handleToolCall('get_best_practices', args as Record<string, unknown>, effectiveReq),
  )

  server.registerTool(
    'get_latest_news',
    {
      description: TOOL_DEFINITIONS[1].description,
      inputSchema: { ecosystem: z.string(), limit: z.number().optional() },
    },
    (args) => handleToolCall('get_latest_news', args as Record<string, unknown>, effectiveReq),
  )

  server.registerTool(
    'get_top_integrations',
    {
      description: TOOL_DEFINITIONS[2].description,
      inputSchema: { ecosystem: z.string(), use_case: z.string().optional() },
    },
    (args) => handleToolCall('get_top_integrations', args as Record<string, unknown>, effectiveReq),
  )

  server.registerTool(
    'search_ecosystem',
    {
      description: TOOL_DEFINITIONS[3].description,
      inputSchema: { query: z.string(), ecosystem: z.string().optional() },
    },
    (args) => handleToolCall('search_ecosystem', args as Record<string, unknown>, effectiveReq),
  )

  server.registerTool(
    'list_ecosystems',
    {
      description: TOOL_DEFINITIONS[4].description,
      inputSchema: {},
    },
    (args) => handleToolCall('list_ecosystems', args as Record<string, unknown>, effectiveReq),
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
  return transport.handleRequest(effectiveReq)
}
