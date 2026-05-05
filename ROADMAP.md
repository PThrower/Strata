# Strata — Product Roadmap

> Trust and safety infrastructure for the agentic economy.

---

## Vision

Strata is the trust and safety infrastructure layer for the agentic economy — the Palantir for AI agents. Every agent that ships in production will need to know what it's connecting to, what those connections can do, and whether they can be trusted. Strata is that answer.

The thesis is simple: as agents proliferate, the surface area of risk explodes. A single agent can chain through dozens of tools, MCP servers, and external endpoints in a single task. Today, no one knows which of those connections are safe. Strata solves that — first for MCP, then for payments, identity, and the full multi-agent stack.

---

## Where we are today (Shipped)

The foundation is live. Strata already provides the only independent trust signal for the MCP ecosystem, with a working REST API, a native MCP server, an SDK, and a CI gate.

| Capability | Status | Detail |
|---|---|---|
| MCP Security Scoring | Live | 0–100 score from GitHub static signals across **2,179 servers** |
| Runtime Behavioral Scoring | Live | Static source analysis + capability and injection penalties |
| Capability Flags | Live | 7 flags: `shell_exec`, `dynamic_eval`, `fs_write`, `arbitrary_sql`, `net_egress`, `secret_read`, `process_spawn` |
| 3-Layer Injection Scanning | Live | Regex → Claude Haiku → Claude Sonnet (extended thinking) |
| Public REST API | Live | `/api/v1/*` with API-key auth, per-IP rate limiting, full audit logging |
| Native MCP Server | Live | 6 tools, 3 prompt templates, 1 resource — at `/mcp` |
| SDK | Live | `@strata-ai/sdk@0.1.2` on npm |
| GitHub Action | Live | `PThrower/strata-mcp-check@v1` — fail builds on risky MCP servers |
| Ecosystem Coverage | Live | 22 ecosystems (Claude, OpenAI, Gemini, Cursor, LangChain, Ollama, Codex, Windsurf, Copilot, …) |

---

## Phase 1 — Trust Foundation (Q2 2026)

Extend the trust model beyond MCP servers. The same scoring rigor that exposed risk in 2,179 MCP servers gets applied to the next two surfaces agents touch: payments and live endpoints.

### x402 Payment Endpoint Verification
Trust scores before agents pay anything. The same scoring model used for MCP servers, applied to x402 endpoints — SSL validity, domain age, payment-amount reasonableness, well-formed `402` responses, and known fraud signals. Agents call this before authorizing payment.

- New REST route: `/api/v1/x402/verify`
- New MCP tool: `verify_payment_endpoint`

### MCP Deeper Integration
Native tool-level scanning, not just server-level. Today we score each MCP server as a whole; this phase scores **individual tools within a server** — because a benign-looking server can ship one tool that does `shell_exec` while the rest are read-only.

### Live Endpoint Probing
Phase 3 of runtime scoring. Move beyond static analysis: actually probe hosted MCP endpoints, observe real tool inventories, measure latency, and validate declared capabilities against runtime behavior.

---

## Phase 2 — Data & Identity Layer (Q3 2026)

The trust signal is only as good as the identity behind it. Phase 2 establishes who's calling what, what data is moving, and an immutable record of every action.

### Agent Identity & Credentialing
Cryptographic identity for every agent. Strata-issued credentials. MCP servers verify agent identity before accepting tool calls. PKI for agents.

### Data Lineage Tracking
Track data flow between MCP servers. See where your data went, which servers touched it, and which `net_egress`-flagged endpoints exfiltrated it. A complete exposure map per agent run.

### Agent Activity Ledger
Immutable, cryptographically signed audit trail of every tool call. Who called what, with what parameters, what came back. The foundation for SOC 2 attestation and any future regulatory regime.

---

## Phase 3 — Policy & Governance Engine (Q4 2026)

Once identity and lineage are in place, organizations can enforce rules. Phase 3 makes Strata the policy plane for agentic systems.

### Policy Engine
Define rules that govern agent behavior. Enforced at the Strata layer, before the call reaches the server.

- "No `shell_exec` in production."
- "`net_egress` requires approval."
- "`fs_write` blocked between 2am and 6am."

### Compliance Reporting
One-click reports for SOC 2, ISO 27001, and emerging AI governance frameworks. Generated directly from the Activity Ledger.

### Real-Time Threat Feed
Live feed of newly discovered malicious servers, capability-flag changes, and active injection attempts. Push alerts when a server you're connected to changes its risk profile.

---

## Phase 4 — Runtime Intelligence (Q1 2027)

Static signals catch the obvious cases. Phase 4 watches behavior in real time and reacts.

### Behavioral Anomaly Detection
Baseline normal agent behavior; alert on deviation. Runtime monitoring, not static scoring — anomalous tool sequences, unusual parameter shapes, payload size spikes.

### Circuit Breaker & Rollback
Automatic disconnection when a risk threshold is crossed. The agent continues in a degraded-safe mode rather than failing open.

### MCP Server Dependency Graph
Visual map of every server, every risk score, every relationship. A single pane of glass for CTOs and security teams — the artifact you show the board.

---

## Phase 5 — Multi-Agent Trust (Q2 2027)

The end state. When agents spawn agents that call agents, trust has to compose. Phase 5 makes that work.

### Multi-Agent Orchestration Trust
Track the full trust chain across multi-agent workflows. Agent A spawns Agent B calls Agent C — every hop credentialed, logged, and policy-enforced.

### Memory Safety Scanning
Scan RAG sources and vector store inputs for injection. Prevent poisoned-memory attacks before they reach the model.

### Cross-Agent Prompt Manipulation Detection
Semantic similarity detection across agent-to-agent messages to catch prompt manipulation that propagates through orchestration boundaries.

---

## Business Model Evolution

The current pricing covers individual builders and supporter accounts. Phases 2–3 unlock the enterprise tier; Phase 1 unlocks platform revenue from payment-rail partners.

| Tier | Price | Audience | Status |
|---|---|---|---|
| Free | 100 calls / month, 5 ecosystems | Hobbyists, evaluators | Live |
| Pro | $29 / month, all ecosystems | Solo devs, small teams | Live |
| Founder Lifetime | $100 one-time, 50 spots | First supporters | Live |
| Enterprise | Custom | Security teams, platforms | Phase 2+ — Policy Engine, Compliance Reporting, Activity Ledger, SLA |
| Platform | Revenue share | Payment-rail partners | Phase 1+ — x402 verification at scale |

---

## Summary

Strata's trajectory is sequenced: trust scoring (shipped) → trust extension to new surfaces (Q2 2026) → identity and ledger (Q3 2026) → policy and governance (Q4 2026) → runtime intelligence (Q1 2027) → multi-agent composition (Q2 2027). Each phase compounds on the last. The endpoint is a single platform that every production agent in the world has a reason to call before it does anything risky.
