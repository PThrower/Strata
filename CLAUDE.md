# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev      # start dev server (Turbopack)
npm run build    # production build
npm run lint     # ESLint
npm run refresh  # run content refresh pipeline (requires .env.local)
npm run mcp      # start stdio MCP transport (requires .env.local)
```

One-time / maintenance scripts (require `.env.local` exported):
```bash
npx tsx scripts/score-mcp-security.ts    # backfill GitHub security scores (~82 min for 2179 repos)
npx tsx scripts/score-mcp-runtime.ts     # backfill runtime scoring (probe each MCP server endpoint)
npx tsx scripts/scan-mcp-injection.ts    # backfill injection scan on mcp_servers (~25 min)
npx tsx scripts/check-feeds.ts           # health-check all configured RSS feeds
npx tsx scripts/debug-validation.ts [slug]  # debug validation pipeline for one ecosystem
```

There are no tests at this time.

## Architecture

This is a SaaS API platform built on **Next.js 16**, **Supabase** (auth + Postgres), and **Stripe** (subscriptions). It exposes AI ecosystem intelligence (best practices, news, integrations) via both a REST API (`/api/v1/*`) and an MCP server (`/mcp`).

### Auth model — two distinct surfaces

| Surface | Auth mechanism | Supabase client |
|---|---|---|
| Dashboard / user UI | Supabase session cookie | `createUserClient()` |
| Public API (`/api/v1/*`) and MCP | `X-API-Key` or `Authorization: Bearer` header | `createServiceRoleClient()` |

`lib/supabase-server.ts` exports both factories. `createServiceRoleClient()` bypasses RLS and is used everywhere the caller is already trusted (API key routes, Stripe webhooks). Never use it for user-initiated requests without validating identity first.

The dashboard page uses **both** clients intentionally: `createUserClient()` to verify the session, then `createServiceRoleClient()` for profile and `api_requests` reads (RLS would block `api_requests` for non-owners).

### Edge security gateway — `proxy.ts`

`proxy.ts` (exported as `proxy`) is the single edge gateway for the entire app. It is **not** named `middleware.ts` — Next.js 16 deprecated the `middleware` convention; only one `proxy.ts` is supported per project, and adding `middleware.ts` is silently ignored. The file also avoids importing `@supabase/ssr` to stay clear of a Turbopack deadlock.

Responsibilities (in order):

1. **Scanner-path block** — returns 404 for `/.env`, `/wp-admin`, `/.git/config`, `/phpinfo.php`, `/admin.php`, etc. Looks like a normal miss to attackers.
2. **Path-traversal block** — rejects `..`, `%2e%2e`, `%252e` in pathname with 400.
3. **For `/api/*` and `/mcp`:**
   - Rejects empty / over-long User-Agent (400)
   - Blocks mass-scanner UAs (`nuclei`, `sqlmap`, `nikto`, `masscan`, `zgrab`, `acunetix`, `nessus`, `gobuster`, `dirb`, `wpscan`, `wfuzz`, `metasploit`, `qualys`, `openvas`, `libwww-perl`, `burpcollab`) with 403
   - **Per-IP sliding-window rate limit**: 100/min for `/api/*`, 30/min for `/mcp`. Buckets keyed `<ip>|<family>` so an MCP burst doesn't starve API.
   - Content-Length pre-check: 413 for >100 KB (api) / >50 KB (mcp) before the route runs
4. **Dashboard session guard** — redirect to `/login` if no Supabase auth cookie. Optimistic check (cookie presence, not signature); routes inside `/dashboard` re-verify with `createUserClient()`.
5. **Security headers** — applied to every response: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection: 1; mode=block`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`.

**Rate-limiter scope**: in-memory `Map<key, timestamps[]>` per Lambda instance. Vercel's Fluid Compute may run several instances, so a per-IP limit can drift proportionally to instance count. Vercel's edge DDoS protection handles the volumetric layer. Migrate to Upstash Redis for strict global enforcement.

`vercel.json` adds the same security headers + HSTS at the CDN level for defense-in-depth, plus `Cache-Control: no-store` on `/api/*` and `/mcp(.*)`.

`lib/security.ts` exposes `readBoundedJson<T>(request, maxBytes)` for chunked-encoding protection — used by `POST /verify-bulk` to catch requests without a `Content-Length` header.

`lib/server-timing.ts` exposes `serverTiming(t0)` — every `/api/v1/*` route attaches `Server-Timing: total;dur=Nms` to its response for latency monitoring.

### Public API pipeline (`lib/api-auth.ts`)

Two auth flows coexist. Use the right one per route:

**`authenticateRequest(req)`** — authenticated-only routes (`POST /verify-bulk`, etc.):
1. Reads `X-API-Key` or `Authorization: Bearer sk_...` header
2. Calls `consume_api_call` RPC (atomic: validates key, rolls monthly window, enforces limits, increments counter)
3. Returns `{ ok: true, profile, supabase }` or `{ ok: false, response }`

**`authenticateOrAnon(req)`** — routes that accept both authenticated and anonymous callers (`GET /mcp/verify`, `GET /mcp-servers`):
- Header present → same auth flow as above, returns `{ ok: true, mode: 'auth', profile, supabase }`
- Header absent → in-memory IP token bucket (10 req/hr per IP, per-process), returns `{ ok: true, mode: 'anon', ip, remaining, resetAt }`
- Returns `{ ok: false, response }` on rate limit or invalid key

Use `rateLimitHeaders(auth)` to get the `X-RateLimit-*` headers to attach to every response from anon-capable routes.

After auth, routes call `checkEcosystemAccess()` to gate pro-only ecosystems, then `logApiRequest()` to write to `api_requests`, then `logQueryAudit()` to write a full query audit record (params, result IDs, latency, client IP) to `api_query_log`. Anonymous callers are logged under sentinel key `'anon'` — the column is plain text with no FK, so this is schema-safe. MCP tool calls go through the same helpers in `lib/mcp-tools.ts`.

### Public API routes (`app/api/v1/`)

| Route | Auth | Description |
|---|---|---|
| `GET /mcp/verify` | anon or key | Single MCP server lookup by `?url=`, `?npm=`, or `?endpoint=`. **Bypasses quarantine filter** — this is the only endpoint that surfaces `is_quarantined=true` rows, because the entire point is to warn callers about dangerous servers. |
| `POST /mcp/verify-bulk` | key required | Batch lookup, up to 50 identifiers. Body: `{ identifiers: [{url?} | {npm?} | {endpoint?}][] }`. Charges `ceil(N/10)` API calls; reports via `X-Strata-Calls-Charged` header. Uses 3 parallel `IN` queries (one per identifier type) for ≤3 DB round trips regardless of N. |
| `GET /mcp-servers` | anon or key | Semantic search over MCP directory. Returns `runtime_score`, `capability_flags`, `hosted_endpoint`, `tool_count`, `runtime_freshness`. Accepts `min_runtime_score`, `exclude_capability_flags` (comma-separated), `require_hosted` filters. |
| `GET /ecosystems/[slug]/brief` | key required | Composite: best practices + news + integrations in one round trip. Three parallel Supabase queries. |
| `GET /best-practices` | key required | Best practices for an ecosystem. |
| `GET /news` | key required | News items for an ecosystem. |
| `GET /integrations` | key required | Integration items for an ecosystem. |
| `GET /search` | key required | Full-text search over content items. |

### Risk computation (`lib/risk.ts`)

Pure `computeRiskLevel(row: RiskInput)` that returns `{ level: RiskLevel, reasons: string[], trusted: boolean }`. Hierarchy (conservative — stops at first match):

1. `is_quarantined = true` OR `security_score < 20` → **critical**, `trusted: false`
2. `capability_flags` includes `shell_exec` or `dynamic_eval` → **high**, `trusted: false`
3. `capability_flags` includes `fs_write` or `arbitrary_sql` → **medium**, `trusted: false`
4. Otherwise → **low**, `trusted: true`

This is the **server-authoritative** risk signal. The `@strata-ai/sdk` ships an identical copy at `packages/sdk/src/risk.ts` so server and client never disagree. Do not change one without updating the other.

### Verify shared helpers (`lib/mcp-verify-shared.ts`)

Shared between `/mcp/verify` and `/mcp/verify-bulk`:
- `McpRow` interface + `VERIFY_SELECT_COLUMNS` constant — single source of truth for which columns to pull
- `normalizeGitHubUrl(input)` — returns `[canonical, canonical.git]` candidates for `.in('url', ...)` lookups. Lowercases owner/repo path segments (GitHub is case-insensitive; our DB stores lowercase).
- `freshnessBucket(iso)` — maps `runtime_updated_at` to `'fresh' | 'aging' | 'stale' | 'unknown'`
- `buildVerifyResult(row | null)` — constructs the full `VerifyResult` JSON shape, including risk assessment

### MCP server (`app/mcp/route.ts`)

HTTP MCP endpoint using `WebStandardStreamableHTTPServerTransport`. `GET /mcp` returns a JSON capability manifest (tools, prompts, resources). `POST /mcp` handles tool calls. Auth flows through `lib/mcp-auth.ts` (accepts both `X-API-Key` and `Authorization: Bearer` headers). A stdio transport variant lives at `scripts/mcp-stdio.ts` (`npm run mcp`).

`lib/mcp-tools.ts` exports three things, all registered identically in both the HTTP route and the stdio script:

- **`TOOL_DEFINITIONS` / `handleToolCall`** — six tools: `get_best_practices`, `get_latest_news`, `get_top_integrations`, `search_ecosystem`, `list_ecosystems`, `find_mcp_servers`.
- **`RESOURCES`** — one static resource: `strata://formatting-guide` (plain-text briefing format guide for agents).
- **`PROMPTS`** — three prompt templates: `ecosystem_briefing`, `cross_ecosystem_compare`, `agent_stack_review`. Each prompt's `arguments` array drives both the MCP argsSchema (Zod) and the `{placeholder}` substitution in its `template` string.

All tool results include an epistemic notice and freshness envelope (`content_age_hours`, `data_freshness` from `lib/freshness.ts`). Quarantined items (`is_quarantined = true`) are filtered from all tool responses.

### Database schema (Supabase Postgres)

Key tables in `supabase/migrations/`:
- **`profiles`** — one row per auth user; holds `api_key` (`sk_` + 32 hex chars), `tier`, `calls_used`, `calls_reset_at`, Stripe IDs. Auto-created by `handle_new_user()` trigger.
- **`ecosystems`** — catalog of supported ecosystems; `available_on_free` gates free-tier access.
- **`content_items`** — content records (`best_practices`, `news`, `integrations`) keyed by `ecosystem_slug`. Has `is_quarantined` and `injection_risk_score` safety columns.
- **`api_requests`** — append-only usage log; no RLS, service role only. `api_key` is plain text (no FK) — anonymous traffic is logged under sentinel `'anon'`.
- **`api_query_log`** — full query audit records (params, result IDs, latency, client IP hashed via HMAC); service role only.
- **`mcp_servers`** — MCP directory sourced from `awesome-mcp-servers`. Key columns:
  - `embedding vector(1024)` — Voyage AI semantic search
  - `security_score` (0–100) — from GitHub signals
  - `runtime_score` (0–100) — from live probe results
  - `capability_flags text[]` — e.g. `['shell_exec', 'fs_write', 'net_egress']`
  - `hosted_endpoint`, `tool_count`, `runtime_updated_at`, `runtime_status`
  - `is_quarantined`, `injection_risk_score`
  - `npm_package` — for npm-based lookup
  - Searched via `search_mcp_servers_v4(...)` RPC: `similarity * (0.5 + 0.5 * security_score/100)`
- **`mcp_runtime_probes`** — per-probe log for runtime scoring backfill (toolCount, latency, error, etc.)

RLS is on for `profiles`, `ecosystems`, `content_items`. Sensitive `profiles` columns (`tier`, `calls_used`, `api_key`, Stripe IDs) have `REVOKE UPDATE` from `authenticated` — all writes to these must go through service-role routes or webhooks.

Full-text search is implemented as a Postgres RPC: `search_content_items(search_query, filter_ecosystem, filter_category, user_tier)`.

Embeddings use **Voyage AI** (`voyage-3`, 1024 dimensions) via direct HTTP fetch in `lib/embeddings.ts` — no npm package, just `fetch` with `Authorization: Bearer ${VOYAGE_API_KEY}`.

### Content refresh pipeline (`scripts/refresh/`)

`npm run refresh` runs `scripts/refresh/index.ts` — a Node script (not a Next.js route) that populates `content_items`. For each ecosystem in `ecosystems.ts`:

1. `fetchAllSources()` — scrapes RSS feeds, GitHub repos, subreddits → raw items
2. `urlDedup()` — filters items whose `source_url` already exists in the DB
3. `validateBatch()` — calls Claude (`claude-sonnet-4-6`) in batches of 20 to score relevance, fix titles/bodies, reclassify categories, and **detect injection content**; low-confidence and quarantined items are separated
4. `dedupeNearDuplicates()` — a second Claude pass to remove near-duplicate stories within the batch
5. `writeContent()` — inserts validated items in chunks of 50; sets `is_quarantined` flag on flagged items
6. `bestPracticesAreStale()` — checks if any `best_practices` rows exist newer than 3 days; if none, calls `generateBestPractices()` which prompts Claude for 3 new items and replaces all existing best practices for that ecosystem via `replaceBestPractices()`

After ecosystem processing, `refreshMcpDirectory()` runs:
1. Fetches `awesome-mcp-servers` README, parses entries
2. Embeds new entries via Voyage AI (batch 20, 500ms delay between batches)
3. Runs two-layer injection scan on each new entry: Layer 1 regex (`lib/injection-scanner.ts`) + Layer 2 Claude Haiku semantic check
4. Upserts with `is_quarantined` flag
5. Scores up to 200 newly-inserted rows via `scripts/refresh/security-score.ts` (3 GitHub API calls per repo, rate-limited to ~80 req/min)

`writer.ts` creates its own Supabase client directly (cannot import `lib/supabase-server.ts` which pulls in `next/headers`).

### MCP directory & security scoring

`mcp_servers` is populated from `awesome-mcp-servers` and scored with two independent signals:

**Security score (0–100)** — from GitHub static signals:
- Stars (log-scale, max +25), last commit age (±15), release discipline (+10), license permissiveness (±10), archived/fork penalties (-25/-10)
- Backfill: `npx tsx scripts/score-mcp-security.ts` — resumable via `score_updated_at`; re-run for `error_rate_limited` rows. `error_transient` rows are **not** retried (dead repos — treat as permanent).

**Runtime score (0–100)** — from live tool-call probes:
- Backfill: `npx tsx scripts/score-mcp-runtime.ts` — probes each `hosted_endpoint`, records tool count / latency / errors to `mcp_runtime_probes`, sets `runtime_status`. Status `error_permanent` (formerly `error_transient`) is skipped on subsequent runs.
- `RUNTIME_LIMIT=20` env var caps the run for testing.

**Injection scan backfill**: `npx tsx scripts/scan-mcp-injection.ts` — Layer 1 regex + Layer 2 Haiku + Layer 3 Sonnet extended-thinking (only for borderline cases). All Claude calls have 30s timeout.

**`GITHUB_TOKEN`** is optional but required for authenticated rate limit (5,000/hr vs 60/hr).

### Agent safety layer

- **`lib/injection-scanner.ts`** — fast regex Layer-1 scanner for prompt injection patterns; returns `{ score: 0–10, hits: string[] }`
- **`lib/freshness.ts`** — wraps query results with `content_age_hours` and `data_freshness` (`fresh` / `recent` / `stale`) based on `published_at`
- **`lib/embeddings.ts`** — `embed(text)` and `embedBatch(texts[])` via Voyage AI HTTP API; never import the `voyageai` npm package (its ESM build is broken in Turbopack)
- Quarantined items (`is_quarantined = true`) are written to the DB but **never returned** by any API route or MCP tool — except `GET /mcp/verify`, which intentionally surfaces them so callers know a server is dangerous
- All API routes emit a `logQueryAudit()` record with full params, result IDs, latency, and client IP to `api_query_log`

### SDK and GitHub Action (external repos)

The public SDK lives in **`github.com/PThrower/strata-sdk`** (npm: `@strata-ai/sdk@0.1.2`). The GitHub Action Marketplace listing lives in **`github.com/PThrower/strata-mcp-check`** (`uses: PThrower/strata-mcp-check@v1`).

**Important naming quirk:** the `strata` package name on npm is taken by an unrelated web framework. The CLI must be invoked as `npx @strata-ai/sdk scan` or `npx @strata-ai/sdk verify`. After `npm install -g @strata-ai/sdk` the bare `strata` binary works.

The SDK ships an identical copy of `lib/risk.ts` at `packages/sdk/src/risk.ts`. If you change the risk-level computation logic here, update the SDK's copy in the same PR. The two files must stay byte-for-byte equivalent in their logic.

### Stripe integration

- `POST /api/stripe/checkout` — creates a Checkout session; sets `client_reference_id` to the user's profile ID so the webhook can match it.
- `POST /api/stripe/webhook` — handles `checkout.session.completed` (upgrades to `pro`) and `customer.subscription.deleted` (downgrades to `free`). Requires raw body bytes for signature verification — do not call `.json()` before `stripe.webhooks.constructEvent`.
- `POST /api/stripe/portal` — creates a Billing Portal session for existing customers.

### Auth pages (`app/(auth)/`)

Login, signup, forgot-password, and reset-password pages all use the `useActionState` hook with Server Actions in `app/actions/auth.ts`. Password strength is enforced both client-side (live `PasswordHint` component) and server-side (`PASSWORD_REGEX`). The reset flow uses Supabase `resetPasswordForEmail()` with `redirectTo: ${NEXT_PUBLIC_APP_URL}/reset-password`; the reset page calls `updateUser({ password })` which works because Supabase sets the session automatically from the email link.

### Docs pages (`app/(marketing)/docs/`)

- **`/docs/sdk`** — SDK reference page (`app/(marketing)/docs/sdk/page.tsx`). Uses `<CodeBlock>` from `_components/CodeBlock.tsx` (client component with clipboard copy). Matches the existing Glass/space-backdrop design system. Action YAML in this page should reference `PThrower/strata-mcp-check@v1`.
- No `/docs` index page — the nav link at `app/(marketing)/layout.tsx:47` currently points directly to `/docs/sdk`.

### Environment variables required

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PRO_PRICE_ID
NEXT_PUBLIC_APP_URL
ANTHROPIC_API_KEY        # refresh pipeline + injection scanning
VOYAGE_API_KEY           # mcp-directory embeddings (voyage-3, direct HTTP fetch)
GITHUB_TOKEN             # optional but needed for 5000/hr GitHub rate limit (scoring backfill)
ADMIN_EMAIL              # email address that gets admin dashboard access
AUDIT_HASH_PEPPER        # HMAC pepper for api_query_log IP/key hashing (warn-only if missing)
```

## Brand & design system

### Color tokens (CSS custom properties in `app/globals.css`)

Two token sets coexist: light/dark dashboard tokens (`--background`, `--foreground`, `--border`, `--muted-foreground`) and the fixed marketing/product space palette:

| Token | Value | Usage |
|---|---|---|
| `--bg-0` | `#05060d` | Deepest space background base |
| `--bg-1` | `#0a0d1a` | Mid space tone |
| `--bg-2` | `#131831` | Lit nebula tone |
| `--emerald-deep` | `#1f5238` | Darkest emerald |
| `--emerald` | `#2d6a4f` | Brand primary |
| `--emerald-bright` | `#3d8a65` | API row left border, interactive accents |
| `--emerald-glow` | `#5fb085` | Italic gradient, return types, check icons, focus ring, live dot |
| `--emerald-light` | `#9be0bd` | Light emerald highlight |
| `--ink` | `#ffffff` | Primary text |
| `--ink-soft` | `rgba(255,255,255,0.84)` | Default body text on dark backgrounds |
| `--ink-muted` | `rgba(255,255,255,0.62)` | Secondary body text, nav links |
| `--ink-faint` | `rgba(255,255,255,0.42)` | Eyebrows, params, meta labels |
| `--hair` / `--rule` | `rgba(255,255,255,0.10)` | Dividers (both defined, same value) |
| `--hair-strong` | `rgba(255,255,255,0.20)` | Stronger dividers |

### Typography

- **Display / headlines**: `var(--font-serif)` = `ui-rounded, system-ui, -apple-system, sans-serif` (SF Pro Rounded on Apple). Weight 500 for h1, 400 for h2+.
- **Body / UI**: `var(--font-sans)` = Inter → Geist Sans → system. Use `font-feature-settings: "ss01", "cv11", "calt"`.
- **Code / labels**: `var(--font-mono)` = `ui-monospace, "SF Mono", Menlo` → Geist Mono.
- Brand wordmark: `var(--font-serif)` 22px, `letter-spacing: 0.18em`, **"S" uppercase, "trata" lowercase** — preserve exactly.
- Hero h1: 72px / weight 500 / line-height 1.02 / tracking -0.025em.
- Section h2: 36px / weight 400.

### Shared UI primitives (`components/ui/`)

Do not recreate these inline — always import them:

| Component | Import | Props |
|---|---|---|
| `<Glass>` | `@/components/ui/glass` | `shimmer?`, `as?`, `className?`, `style?` |
| `<Btn>` | `@/components/ui/button` | `variant` (`emerald\|ghost\|white\|outline`), `href?`, `arrow?` |
| `<LiveBadge>` | `@/components/ui/live-badge` | none |
| `<SectionHeading>` | `@/components/ui/section-heading` | `title`, `meta?` |
| `<SpaceBackdrop>` | `@/components/ui/space-backdrop` | none (renders `.mkt-space` layers) |

These wrap the CSS classes in `globals.css` (`glass`, `shimmer`, `mkt-btn`, `btn-{variant}`, etc.). All visual logic stays in CSS. `SpaceBackdrop` is mounted in `app/layout.tsx` (root layout) so it applies globally — no need to add it per-page.

### Glass primitive

`.glass` class provides the frosted panel treatment. Content must be wrapped or `.glass > *` automatically gets `position: relative; z-index: 3`. Add `.shimmer` for hover sweep effect. Key properties: `backdrop-filter: blur(28px) saturate(190%)`, faint emerald corner cast, `::after` top specular sheen.

### Design rules

- Tool/method rows: `border-left: 2px solid var(--emerald-bright)` — never cards.
- Pricing: feature comparison rows with hairline `border-top` — never bullet lists.
- Focus ring: `outline: 2px solid var(--emerald-glow); outline-offset: 3px` — globally applied in `globals.css`.
- All decorative animation gated by `@media (prefers-reduced-motion)`.
- No component libraries (no shadcn, MUI, etc.).
- `proxy.ts` not `middleware.ts` (Next.js 16 Turbopack convention).
