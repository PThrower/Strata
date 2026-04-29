import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { TOOL_DEFINITIONS, handleToolCall } from '../lib/mcp-tools'

const apiKey = process.env.STRATA_API_KEY
if (!apiKey) {
  console.error('Error: STRATA_API_KEY environment variable is required.')
  console.error(
    'Set it in your MCP client config or run: STRATA_API_KEY=sk_... npm run mcp',
  )
  process.exit(1)
}

const mockReq = new Request('http://localhost/mcp', {
  headers: { 'x-api-key': apiKey },
})

async function main() {
  const server = new McpServer({ name: 'strata', version: '1.0.0' })

  server.registerTool(
    'get_best_practices',
    {
      description: TOOL_DEFINITIONS[0].description,
      inputSchema: { ecosystem: z.string(), category: z.string().optional() },
    },
    (args) => handleToolCall('get_best_practices', args as Record<string, unknown>, mockReq),
  )

  server.registerTool(
    'get_latest_news',
    {
      description: TOOL_DEFINITIONS[1].description,
      inputSchema: { ecosystem: z.string(), limit: z.number().optional() },
    },
    (args) => handleToolCall('get_latest_news', args as Record<string, unknown>, mockReq),
  )

  server.registerTool(
    'get_top_integrations',
    {
      description: TOOL_DEFINITIONS[2].description,
      inputSchema: { ecosystem: z.string(), use_case: z.string().optional() },
    },
    (args) =>
      handleToolCall('get_top_integrations', args as Record<string, unknown>, mockReq),
  )

  server.registerTool(
    'search_ecosystem',
    {
      description: TOOL_DEFINITIONS[3].description,
      inputSchema: { query: z.string(), ecosystem: z.string().optional() },
    },
    (args) => handleToolCall('search_ecosystem', args as Record<string, unknown>, mockReq),
  )

  const transport = new StdioServerTransport()
  await server.connect(transport)
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
