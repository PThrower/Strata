# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev      # start dev server (uses Turbopack by default in Next 16)
npm run build    # production build
npm run lint     # ESLint
```

There are no tests at this time.

## Architecture

This is a SaaS API platform built on **Next.js 16**, **Supabase** (auth + Postgres), and **Stripe** (subscriptions).

### Auth model — two distinct surfaces

| Surface | Auth mechanism | Supabase client |
|---|---|---|
| Dashboard / user UI | Supabase session cookie | `createUserClient()` |
| Public API (`/api/v1/*`) | `X-API-Key` header | `createServiceRoleClient()` |

`lib/supabase-server.ts` exports both factories. `createServiceRoleClient()` bypasses RLS and is used everywhere the caller is already trusted (API key routes, Stripe webhooks). Never use it for user-initiated requests without validating identity first.

### Route guard — `proxy.ts` not `middleware.ts`

The session guard lives in `proxy.ts` (exported as `proxy`) and is **not** named `middleware.ts`. This is intentional: `@supabase/ssr` causes a Turbopack deadlock when imported from middleware. `proxy.ts` uses plain cookie inspection (`sb-<projectRef>-auth-token`) instead of the SSR client to stay deadlock-free.

### Public API pipeline (`lib/api-auth.ts`)

Every `/api/v1/*` route calls `authenticateRequest(req)` which:
1. Reads `X-API-Key` header
2. Looks up the profile (service-role client)
3. Resets the monthly usage window if elapsed
4. Enforces per-tier limits (`FREE_LIMIT = 100`, `PRO_LIMIT = 10_000`)
5. Increments `calls_used`
6. Returns `{ ok: true, profile, supabase }` or `{ ok: false, response }`

After auth, routes call `checkEcosystemAccess()` to gate pro-only ecosystems, then `logApiRequest()` to write to `api_requests`.

### Database schema (Supabase Postgres)

Key tables in `supabase/migrations/`:
- **`profiles`** — one row per auth user; holds `api_key`, `tier`, `calls_used`, `calls_reset_at`, Stripe IDs. Auto-created by `handle_new_user()` trigger.
- **`ecosystems`** — catalog of supported ecosystems; `available_on_free` gates free-tier access.
- **`content_items`** — content records (`best_practices`, `news`, `integrations`) keyed by `ecosystem_slug`.
- **`api_requests`** — append-only audit log; no RLS, service role only.

RLS is on for `profiles`, `ecosystems`, `content_items`. Sensitive `profiles` columns (`tier`, `calls_used`, `api_key`, Stripe IDs) have `REVOKE UPDATE` from `authenticated` — all writes to these must go through service-role routes or webhooks.

Full-text search is implemented as a Postgres RPC: `search_content_items(search_query, filter_ecosystem, filter_category, user_tier)`.

### Stripe integration

- `POST /api/stripe/checkout` — creates a Checkout session; sets `client_reference_id` to the user's profile ID so the webhook can match it.
- `POST /api/stripe/webhook` — handles `checkout.session.completed` (upgrades to `pro`) and `customer.subscription.deleted` (downgrades to `free`). Requires raw body bytes for signature verification — do not call `.json()` before `stripe.webhooks.constructEvent`.
- `POST /api/stripe/portal` — creates a Billing Portal session for existing customers.

### Environment variables required

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PRO_PRICE_ID
NEXT_PUBLIC_APP_URL
```

## Brand & design system

### Color tokens (CSS custom properties in `app/globals.css`)

| Token | Value | Usage |
|---|---|---|
| `--bg-0` | `#05060d` | Deepest space background base |
| `--bg-1` | `#0a0d1a` | Mid space tone |
| `--bg-2` | `#131831` | Lit nebula tone |
| `--emerald` | `#2d6a4f` | Brand primary |
| `--emerald-bright` | `#3d8a65` | API row left border, interactive accents |
| `--emerald-glow` | `#5fb085` | Italic gradient, return types, check icons, focus ring, live dot |
| `--ink` | `#ffffff` | Primary text |
| `--ink-soft` | `rgba(255,255,255,0.84)` | Default body text on dark backgrounds |
| `--ink-muted` | `rgba(255,255,255,0.62)` | Secondary body text, nav links |
| `--ink-faint` | `rgba(255,255,255,0.42)` | Eyebrows, params, meta labels |
| `--hair` / `--rule` | `rgba(255,255,255,0.10)` | Dividers |

### Typography

- **Display / headlines**: `var(--font-serif)` = `ui-rounded, system-ui, -apple-system, sans-serif` (SF Pro Rounded on Apple). Weight 500 for h1, 400 for h2+.
- **Body / UI**: `var(--font-sans)` = Inter (loaded via `next/font`) → Geist Sans → system. Use `font-feature-settings: "ss01", "cv11", "calt"`.
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

These wrap the CSS classes in `globals.css` (`glass`, `shimmer`, `mkt-btn`, `btn-{variant}`, etc.). All visual logic stays in CSS.

### Space background (marketing layout)

The page background is a 5-layer fixed stack defined in `app/globals.css` and mounted in `app/(marketing)/layout.tsx`:
`.mkt-space` → `.mkt-nebula` → `.mkt-stars` (animated) → `.mkt-horizon` → `.mkt-grain`

The same background system should be reused on dashboard, docs, and status pages.

### Glass primitive

`.glass` class provides the frosted panel treatment. Content must be wrapped or `.glass > *` automatically gets `position: relative; z-index: 3`. Add `.shimmer` for hover sweep effect. Key properties: `backdrop-filter: blur(28px) saturate(190%)`, faint emerald corner cast, `::after` top specular sheen.

### Design rules

- Tool/method rows: `border-left: 2px solid var(--emerald-bright)` — never cards.
- Pricing: feature comparison rows with hairline `border-top` — never bullet lists.
- Focus ring: `outline: 2px solid var(--emerald-glow); outline-offset: 3px` — globally applied in `globals.css`.
- All decorative animation gated by `@media (prefers-reduced-motion)`.
- No component libraries (no shadcn, MUI, etc.).
- `proxy.ts` not `middleware.ts` (Next.js 16 Turbopack convention).

### MCP server

Strata exposes all four tools (`get_best_practices`, `get_latest_news`, `get_top_integrations`, `search_ecosystem`) as both REST endpoints (`/api/v1/*`) and MCP tools (`/mcp`). Auth helper at `lib/mcp-auth.ts`, tool handlers at `lib/mcp-tools.ts`, stdio transport at `scripts/mcp-stdio.ts` (`npm run mcp`).
