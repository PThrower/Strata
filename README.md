# Strata

AI ecosystem intelligence for agents. One endpoint, 22+ AI ecosystems, machine-readable best practices, news, and integrations — delivered as both a REST API and a native MCP server.

**Live:** [usestrata.dev](https://usestrata.dev) · **Docs:** [usestrata.dev/docs](https://usestrata.dev/docs)

## What it does

Agents need current, structured knowledge about the AI tools they work with. Strata provides that knowledge across 22 ecosystems (Claude, OpenAI, Gemini, Cursor, Windsurf, LangChain, Vercel AI SDK, and more) via:

- `GET /api/v1/best-practices` — verified best practices, optionally filtered by category
- `GET /api/v1/news` — latest news (real-time on Pro, 24h delayed on Free)
- `GET /api/v1/integrations` — top integrations and MCP servers, optionally by use case
- `GET /api/v1/search` — full-text search across all content
- `POST /mcp` — same data exposed as MCP tools (`get_best_practices`, `get_latest_news`, `get_top_integrations`, `search_ecosystem`, `list_ecosystems`)

Content is refreshed continuously: feeds are scraped, validated by Claude for relevance, deduplicated, and written to Postgres. Best practices are regenerated when stale.

## Quick start

Sign up at [usestrata.dev/signup](https://usestrata.dev/signup) for an API key.

**REST:**
```bash
curl -H "X-API-Key: sk_your_key" \
  "https://www.usestrata.dev/api/v1/best-practices?ecosystem=claude"
```

**MCP (Claude Code):**
```bash
claude mcp add strata --transport http \
  https://www.usestrata.dev/mcp \
  --header "Authorization: Bearer sk_your_key"
```

**MCP (Claude Desktop, Cursor, Windsurf, Cline):**
```json
{
  "mcpServers": {
    "strata": {
      "url": "https://www.usestrata.dev/mcp",
      "headers": {
        "Authorization": "Bearer sk_your_key"
      }
    }
  }
}
```

Free tier: 100 calls/month, free ecosystems only. Pro tier: 10,000 calls/month, all ecosystems, real-time news.

## Tech stack

- **Next.js 16** (App Router, Turbopack)
- **Supabase** — Postgres + auth, RLS-enforced
- **Stripe** — subscriptions
- **Anthropic Claude** — content validation + best-practice generation in the refresh pipeline
- **MCP SDK** — `@modelcontextprotocol/sdk` with `WebStandardStreamableHTTPServerTransport`

## Local development

Requires Node 20+ and a `.env.local` with the variables documented in [`CLAUDE.md`](./CLAUDE.md).

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm run lint     # ESLint
npm run refresh  # populate content_items from sources (requires ANTHROPIC_API_KEY)
npm run mcp      # stdio MCP transport for local clients
```

Architecture, auth model, refresh pipeline, and design system are all documented in [`CLAUDE.md`](./CLAUDE.md). Migrations live in [`supabase/migrations/`](./supabase/migrations).

## Repository status

Source-available for transparency. Not currently accepting external pull requests — feedback and bug reports are welcome via [GitHub Issues](https://github.com/PThrower/Strata/issues).
