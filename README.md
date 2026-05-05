# Strata

**The trust layer for AI agents.**

Strata scores every MCP server for security and behavioral 
risk — so your agents know what they're connecting to before 
they connect.

[![Strata MCP server](https://glama.ai/mcp/servers/PThrower/Strata/badges/card.svg)](https://glama.ai/mcp/servers/PThrower/Strata)

[![Strata MCP server](https://glama.ai/mcp/servers/PThrower/Strata/badges/score.svg)](https://glama.ai/mcp/servers/PThrower/Strata)

→ [usestrata.dev](https://usestrata.dev)

---

## What it does

Every MCP server gets two trust scores:

- **security_score** (0–100) — repo health: stars, license, 
  maintenance, archive status
- **runtime_score** (0–100) — behavioral analysis: what tools 
  the server actually exposes

Plus capability flags:

`shell_exec` `dynamic_eval` `fs_write` `arbitrary_sql` 
`net_egress` `secret_read` `process_spawn`

And a 3-layer injection scanner.

We scanned 2,179 MCP servers across 22 AI ecosystems. 
Found shell_exec in 340+ servers, dynamic_eval in 180+, 
and one server with active prompt injection (now quarantined).

---

## Quick start

### Scan your Claude Desktop config
```bash
npx @strata-ai/sdk scan
```

### Verify any MCP server
```bash
npx @strata-ai/sdk verify github.com/owner/repo
```

### GitHub Action — gate every PR
```yaml
- uses: PThrower/strata-mcp-check@v1
  with:
    strata_api_key: ${{ secrets.STRATA_API_KEY }}
    fail_on: critical
```

### REST API
```bash
curl -H "X-API-Key: your_key" \
  "https://usestrata.dev/api/v1/mcp/verify?url=github.com/owner/repo"
```

### MCP Server (use inside Claude Code, Cursor, etc.)
https://www.usestrata.dev/mcp

---

## Ecosystems

Claude · OpenAI · Gemini · Cursor · Copilot · LangChain · 
Ollama · Groq · Codex · Windsurf · Perplexity · Together AI · 
Replicate · Fireworks · Exa · Cody · YouCom · Bolt · V0 · 
Manus · Higgsfield · Cohere

| Tier | Price | Calls | Ecosystems |
|------|-------|-------|------------|
| Free | $0 | 100/month | 5 core |
| Pro | $29/month | 10,000/month | All 22 |
| Founder | $100 one-time | 10,000/month forever | All 22, forever |

---

## Links

- [Dashboard](https://usestrata.dev/dashboard)
- [Docs](https://usestrata.dev/docs)
- [SDK Docs](https://usestrata.dev/docs/sdk)
- [npm: @strata-ai/sdk](https://www.npmjs.com/package/@strata-ai/sdk)
- [GitHub Action](https://github.com/marketplace/actions/strata-mcp-security-check)

---

## License

MIT
