# Strata

### The trust and safety infrastructure layer for the agentic economy.

[![npm version](https://img.shields.io/npm/v/@strata-ai/sdk.svg)](https://www.npmjs.com/package/@strata-ai/sdk)
[![GitHub Action](https://img.shields.io/badge/GitHub%20Action-v1-blue)](https://github.com/marketplace/actions/strata-mcp-security-check)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[![Strata MCP server](https://glama.ai/mcp/servers/PThrower/Strata/badges/card.svg)](https://glama.ai/mcp/servers/PThrower/Strata)

Security scoring, agent identity, payment verification, data lineage, policy enforcement, and compliance reporting for AI agents and MCP servers.

---

AI agents connect to dozens of MCP servers, call payment endpoints, and move data between services — with no way to know which connections are safe, who is calling what, or where the data went. Strata is the trust layer that sits in front of all of it: scoring every server before your agent connects, issuing cryptographic identities to agents, enforcing policies before tool calls execute, and generating tamper-evident audit trails for compliance. It is infrastructure for teams shipping agents in production, not a scanner you run once.

---

## Features

### Security Scoring

- 2,179 MCP servers scored across 22 AI ecosystems
- `security_score` (0–100): GitHub health signals — stars, commit recency, license, archived status, fork penalties
- `runtime_score` (0–100): live endpoint probing + static analysis + tool behavior
- Per-tool scanning: identifies which specific tools within a server are dangerous, not just the server
- 7 capability flags: `shell_exec`, `dynamic_eval`, `fs_write`, `arbitrary_sql`, `net_egress`, `secret_read`, `process_spawn`
- 3-layer injection scanning: regex → Claude Haiku → Claude Sonnet (extended thinking); score ≥ 6/10 quarantines permanently
- Circuit breaker: automatic disconnection when a server crosses a critical risk threshold

### Agent Identity & Data

- Ed25519-signed agent credentials (JWTs) with live JWKS endpoint at `/.well-known/jwks.json`
- Append-only tamper-evident audit ledger — every tool call signed with HMAC-SHA256
- Data lineage tracking: record and query data flows between MCP servers
- x402 payment endpoint verification: SSL validity, domain age, amount reasonableness before your agent pays

### Policy & Governance

- Policy engine: 5 condition types (capability flags, risk level, tool name, time window, agent scope) enforced before tool calls execute
- One-click SOC 2 / ISO 27001 compliance export from the activity ledger — JSON and CSV
- Real-time threat feed: Postgres trigger fires when servers change risk profile
- Behavioral anomaly detection: 30-day rolling baselines, 3 detectors (volume spike, high-risk surge, net-egress surge), hourly analysis

### Runtime Intelligence

- MCP server dependency graph: visual map of every server your agents depend on, with risk scores, capability flags, and circuit breaker status
- `affected_only` filter on the threat feed: surface events relevant to servers you've actually connected to

---

## Quick Start

**Option 1 — SDK**
```bash
npx @strata-ai/sdk scan
```
Scans your `claude_desktop_config.json` and scores every MCP server in it.

**Option 2 — REST API**
```bash
curl "https://usestrata.dev/api/v1/mcp/verify?url=github.com/owner/repo" \
  -H "X-API-Key: YOUR_KEY"
```

**Option 3 — Native MCP server (Claude Code, Cursor, any MCP client)**
```bash
claude mcp add strata --transport http \
  https://www.usestrata.dev/mcp \
  --header "Authorization: Bearer YOUR_KEY"
```

**Option 4 — GitHub Action**
```yaml
- uses: PThrower/strata-mcp-check@v1
  with:
    api_key: ${{ secrets.STRATA_API_KEY }}
```
Posts a trust report comment on every PR. Fails the build on critical risk.

---

## API Reference

| Route | Method | Description |
|---|---|---|
| `/api/v1/mcp/verify` | GET | Verify an MCP server by URL, npm package, or hosted endpoint |
| `/api/v1/mcp/verify-bulk` | POST | Batch verify up to 50 servers |
| `/api/v1/x402/verify` | GET | Verify an x402 payment endpoint before paying |
| `/api/v1/agents` | POST | Issue an Ed25519-signed agent credential |
| `/api/v1/agents/:id/revoke` | POST | Revoke an agent credential immediately |
| `/api/v1/agents/verify` | POST | Verify an agent credential (live revocation check) |
| `/api/v1/lineage` | POST/GET | Record or query data flows between MCP servers |
| `/api/v1/policies` | GET/POST | List or create enforcement policies |
| `/api/v1/threats` | GET | Query the real-time threat feed |
| `/api/v1/circuit-breakers` | GET | List tripped circuit breakers; manage per-profile resets |
| `/api/v1/dependency-graph` | GET | Retrieve your agent dependency graph |
| `/api/v1/anomalies` | GET | List behavioral anomaly events |
| `/api/compliance/report` | GET | Generate SOC 2 / ISO 27001 compliance export |

All routes accept `X-API-Key` or `Authorization: Bearer` headers. Anonymous callers get 10 requests/hour.

---

## MCP Tools

Nine tools registered on the native MCP server at `https://www.usestrata.dev/mcp`:

| Tool | Description |
|---|---|
| `get_best_practices` | Verified best practices per AI ecosystem |
| `get_latest_news` | Releases, deprecations, changelog deltas |
| `get_top_integrations` | Tools and SDKs ordered by adoption signal |
| `search_ecosystem` | Semantic search across the indexed corpus |
| `list_ecosystems` | List ecosystems available on your tier |
| `find_mcp_servers` | Search 2,179+ scored servers by capability or use case |
| `verify_payment_endpoint` | Trust score for an x402 endpoint before paying |
| `verify_agent_credential` | Verify an Ed25519 agent JWT with live revocation |
| `track_data_flow` | Record a data flow between two MCP servers |
| `get_threat_feed` | Recent risk-signal changes for MCP servers |

---

## Pricing

| Tier | Price | Calls | Ecosystems |
|---|---|---|---|
| Free | $0 | 100 / month | 5 core ecosystems |
| Pro | $29 / month | 10,000 / month | All 22 ecosystems, all features |
| Founder | $100 one-time | 10,000 / month, forever | All 22 ecosystems, all future features, 50 spots total |

---

## Links

- **Dashboard**: [usestrata.dev/dashboard](https://usestrata.dev/dashboard)
- **Docs**: [usestrata.dev/docs](https://usestrata.dev/docs)
- **SDK Docs**: [usestrata.dev/docs/sdk](https://usestrata.dev/docs/sdk)
- **How It Works**: [usestrata.dev/how-it-works](https://usestrata.dev/how-it-works)
- **npm**: [@strata-ai/sdk](https://www.npmjs.com/package/@strata-ai/sdk)
- **GitHub Action**: [marketplace/actions/strata-mcp-security-check](https://github.com/marketplace/actions/strata-mcp-security-check)
- **Support**: support@usestrata.dev

---

## License

MIT
