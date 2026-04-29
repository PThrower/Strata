import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { TOOL_DEFINITIONS, handleToolCall, RESOURCES, PROMPTS } from '../lib/mcp-tools'

const G     = '\x1b[38;2;0;196;114m'
const DIM   = '\x1b[2m'
const BOLD  = '\x1b[1m'
const RESET = '\x1b[0m'

const apiKey = process.env.STRATA_API_KEY
if (!apiKey) {
  process.stderr.write(`\n${G}  ✗${RESET} ${BOLD}STRATA_API_KEY not set${RESET}\n`)
  process.stderr.write(`${DIM}  Set it: export STRATA_API_KEY=sk_your_key${RESET}\n\n`)
  process.exit(1)
}

const mockReq = new Request('http://localhost/mcp', {
  headers: { 'x-api-key': apiKey },
})

async function main() {
  process.stderr.write(`\n${G}${BOLD}  ▲ STRATA${RESET}  MCP Server v1.0.0\n`)
  process.stderr.write(`${DIM}  ─────────────────────────────────${RESET}\n`)
  process.stderr.write(`\n${G}  ●${RESET} get_best_practices      ${DIM}→ structured[]${RESET}\n`)
  process.stderr.write(`${G}  ●${RESET} get_latest_news         ${DIM}→ news[]${RESET}\n`)
  process.stderr.write(`${G}  ●${RESET} get_top_integrations    ${DIM}→ ranked[]${RESET}\n`)
  process.stderr.write(`${G}  ●${RESET} search_ecosystem        ${DIM}→ results[]${RESET}\n`)
  process.stderr.write(`${DIM}  prompts: ecosystem_briefing, cross_ecosystem_compare, agent_stack_review${RESET}\n`)
  process.stderr.write(`${DIM}  resources: strata://formatting-guide${RESET}\n`)

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

  const transport = new StdioServerTransport()
  await server.connect(transport)
  process.stderr.write(`${G}  ✓${RESET} Connected to MCP client\n`)
}

main().catch((err) => {
  process.stderr.write(`${G}  ✗${RESET} Fatal: ${err}\n`)
  process.exit(1)
})
