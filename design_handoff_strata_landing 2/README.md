# Handoff: Strata — Landing Page (v2) + System Template

> **Supersedes the v1 handoff.** Use this version. Discard prior `Strata Landing.html` reference.

## Overview
Marketing landing page for **Strata** — an **AI ecosystem intelligence platform delivered as an HTTP API and an MCP (Model Context Protocol) server**. Single long-scroll page: nav, hero, ecosystems, methods reference, pricing, footer.

This file is also the **visual template** for the rest of the product surface — dashboard, docs, console, status — so all design tokens and primitives in this README are intended to be promoted to a shared theme/component layer in the codebase, not scoped to the landing page alone.

## About the Design Files
The file in this bundle (`Strata Landing v2.html`) is a **design reference** — a self-contained HTML prototype showing the intended look, motion, and copy. It is **not** production code to copy markup-for-markup.

Recreate it in this codebase using its existing patterns (Next.js / React / styling system / component library / routing). Lift the visual values; reshape the structure to fit the codebase. If something here doesn't have a clean equivalent in the codebase, ask before inventing one.

## Fidelity
**High-fidelity.** Final colors, typography, spacing, motion, glass treatment, and copy. Match precisely.

---

## Product framing (read this before writing copy)

Strata is delivered through **two surfaces** that share the same backing intelligence:

1. **HTTP API** — `api/v1`, REST. Used by anything that can hit an endpoint.
2. **MCP server** — Model Context Protocol. Used by agent runtimes (Claude Desktop, Claude Code, Cursor, agent frameworks) that speak MCP natively. The four "verbs" on the page (`get_best_practices`, `get_latest_news`, `get_top_integrations`, `search_ecosystem`) are exposed both as REST endpoints **and** as MCP tools with the same names and shapes.

Wherever the marketing copy says "the API," "an endpoint," or "the docs," the implementation should treat it as **API + MCP**. The on-page eyebrow now reads "ai ecosystem intelligence — api & mcp" and the methods section meta reads "api/v1 · rest + mcp" to reflect this.

When the developer recreates this in the codebase, the methods section should plausibly support tabbed code samples (`curl` / `fetch` / `mcp`) — flag this as a likely near-term iteration even if v1 ships without it.

---

## This is also the template for the rest of the product

The visual system (palette, type, glass primitive, button styles, section heading pattern, motion vocabulary) is intended to be shared across:

- **Marketing site** (this page, plus future pages)
- **Dashboard** (logged-in console: usage, keys, billing, ecosystem coverage, request log)
- **Docs** (REST + MCP reference, guides, changelog)
- **Status page**
- **Auth flows** (sign-in, key issuance)

Recommendation when implementing:
- Promote every value in *Design Tokens* below to a shared theme module (CSS vars, Tailwind config, or theme object).
- Promote the **Glass primitive** to a single component / utility class used across all surfaces.
- Promote the **section heading pattern** (`<h2>` + meta caption right-aligned) to a reusable header.
- Promote the four **button variants** to a single `<Button variant="emerald|ghost|white|outline">`.
- Promote the **live badge** (animated pulsing dot) to a status component used on the status page and dashboard.

Surfaces that need adjustment for product use (not in the landing reference):
- Dashboard data tables: same glass panels but with denser type and tabular numerics
- Docs code blocks: the same SF Mono treatment as `.api-fn`, with syntax highlighting added
- Forms: derive input styling from `.btn-outline` (translucent fill, white-30% border)

---

## Design tokens

### Color
| Token | Value | Usage |
|---|---|---|
| `--bg-0` | `#05060d` | Deepest base of space background |
| `--bg-1` | `#0a0d1a` | Mid space tone |
| `--bg-2` | `#131831` | Lit nebula tone |
| `--emerald-deep` | `#1f5238` | Pro card deep tone |
| `--emerald` | `#2d6a4f` | Brand primary, button text on white |
| `--emerald-bright` | `#3d8a65` | API row left border, brand dot, CTA mid-tone |
| `--emerald-glow` | `#5fb085` | Italic accent, return-type code, check icons, focus ring |
| `--emerald-light` | `#9be0bd` | Highlight tone reserved for future use |
| `--ink` | `#ffffff` | Primary text |
| `--ink-soft` | `rgba(255,255,255,0.84)` | Default body text |
| `--ink-muted` | `rgba(255,255,255,0.62)` | Body copy on glass, nav links |
| `--ink-faint` | `rgba(255,255,255,0.42)` | Eyebrows, params, footer right |
| `--hair` | `rgba(255,255,255,0.10)` | Standard divider |
| `--hair-strong` | `rgba(255,255,255,0.20)` | Glass border |

### Typography
| Role | Stack | Notes |
|---|---|---|
| Display headlines | SF Compact Rounded → falls back through `-apple-system-rounded, ui-rounded, system-ui, sans-serif` | Used for hero h1 and brand wordmark. Weight 500. |
| Section headings (h2) | Same as display | Weight 400, 36px. |
| Body / UI | Inter → `-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif` | Use OpenType features `ss01, cv11, calt` for humanist forms — meaningfully better readability. |
| Code / labels | SF Mono → `ui-monospace, "SF Mono", "SFMono-Regular", Menlo, Consolas, monospace` | |

Apply globally:
```css
-webkit-font-smoothing: antialiased;
-moz-osx-font-smoothing: grayscale;
text-rendering: optimizeLegibility;
font-feature-settings: "ss01", "cv11", "calt";  /* on body */
font-optical-sizing: auto;
letter-spacing: -0.011em;  /* on body */
line-height: 1.55;          /* on body */
```

### Type scale
- Hero h1: 72px / weight 500 / line-height 1.02 / tracking -0.025em (mobile: 52px @ ≤980px, 40px @ ≤600px)
- Section h2: 36px / weight 400 / line-height 1.08 / tracking -0.02em
- Price number: 56px / weight 400 / tracking -0.02em
- Body: 16.5px / 1.6 / weight 400
- Eyebrow / section meta: 11.5px mono / tracking 0.18–0.20em / uppercase / weight 500
- Nav link: 14px / weight 450
- Button label: 14px / weight 500
- API fn / params: 14px mono / 11.5px mono
- Brand wordmark: 22px display / **letter-spacing 0.18em**, with **"S" uppercase, "trata" lowercase** (a styled monogram — preserve this exactly across all surfaces)

### Spacing & radii
- Page max-width: 1200px, padding 32px (16px @ ≤600px)
- Section vertical padding: 72px (48px @ ≤600px)
- Glass radii: 22px (nav, footer, foot strip), 24px (default), 26px (price card), 14px (API row)
- Buttons: pill (`border-radius: 999px`), padding `11px 18px`

---

## The Space Background

A layered fixed-position stack (back to front):

1. `.space` — `radial-gradient(120% 80% at 50% 0%, #0e1430 0%, #07091a 40%, #04050c 80%)`
2. `.nebula` — four blurred radial pools (emerald + violet + emerald + indigo) at `filter: blur(20px)`
3. `.stars` — two pseudo-element layers of dots (small/faint + larger/twinkling) animated via `drift-slow 240–360s linear infinite` and `twinkle 6s ease-in-out infinite`. Wrap animations in `@media (prefers-reduced-motion: reduce)` to disable.
4. `.horizon` — `radial-gradient(60% 100% at 50% 100%, rgba(61,138,101,0.28), transparent 70%)` blurred 30px, anchored bottom
5. `.grain` — fixed SVG `feTurbulence` data-URL at `opacity: 0.5; mix-blend-mode: overlay` to kill banding

Reuse the same background on dashboard, docs, status. The horizon glow may be reduced or removed on dashboard if it competes with data viz.

## The Glass primitive

```css
.glass {
  position: relative;
  background:
    linear-gradient(135deg,
      rgba(255,255,255,0.16) 0%,
      rgba(255,255,255,0.07) 35%,
      rgba(255,255,255,0.04) 70%,
      rgba(95,176,133,0.06) 100%);   /* faint emerald cast at the corner */
  backdrop-filter: blur(28px) saturate(190%);
  -webkit-backdrop-filter: blur(28px) saturate(190%);
  border: 1px solid rgba(255,255,255,0.16);
  border-top-color:  rgba(255,255,255,0.40);   /* light refraction top */
  border-left-color: rgba(255,255,255,0.32);   /* light refraction left */
  border-radius: 24px;
  box-shadow:
    inset 0  1px 0 0 rgba(255,255,255,0.45),
    inset 1px 0 0 0 rgba(255,255,255,0.22),
    inset 0 -1px 0 0 rgba(0,0,0,0.30),
    inset 0  0 40px 0 rgba(95,176,133,0.05),
    0 24px 60px -24px rgba(0,0,0,0.7),
    0 4px 14px -4px rgba(0,0,0,0.4),
    0 0 0 0.5px rgba(0,0,0,0.4);
}
.glass::after {  /* top specular sheen */
  content: "";
  position: absolute;
  inset: 1px 1px auto 1px;
  height: 50%;
  border-radius: 22px 22px 0 0;
  background: linear-gradient(180deg,
    rgba(255,255,255,0.10) 0%,
    rgba(255,255,255,0.04) 40%,
    transparent 100%);
  pointer-events: none;
}
.glass::before {  /* hover shimmer sweep */
  content: "";
  position: absolute; inset: 0; border-radius: inherit;
  background: linear-gradient(115deg,
    transparent 30%,
    rgba(255,255,255,0.22) 48%,
    rgba(255,255,255,0.06) 56%,
    transparent 70%);
  transform: translateX(-110%);
  transition: transform 900ms cubic-bezier(.2,.7,.2,1);
  pointer-events: none;
  opacity: 0;
}
.glass.shimmer:hover::before { transform: translateX(110%); opacity: 1; }
.glass > * { position: relative; z-index: 2; }
```

When converting to a component, expose props for: `shimmer?: boolean`, `tint?: 'neutral' | 'emerald'` (controls the corner tint), `elevated?: boolean` (drops the outer shadow for inline use).

---

## Sections

### 1. Nav (sticky)
- Sticky at `top: 16px`, `z-index: 50`. Glass bar 64px tall, radius 22px.
- **Brand**: 9px emerald-glow dot (with white inner ring + green box-shadow halos at 14px and 28px) + wordmark in display font, **"S" uppercase, "trata" lowercase**, letter-spacing 0.18em, size 22px.
- **Right**: muted "docs", "pricing" links → white on hover; emerald CTA "get api key →".
- Required global reset: `a { color: inherit; text-decoration: none; }`

### 2. Hero
- Padding `96px 0 64px`.
- Eyebrow: mono uppercase **"ai ecosystem intelligence — api & mcp"** with 32×1px white-35% rule prepended.
- h1 (72px display, weight 500):
  - Line 1: "Verified knowledge,"
  - Line 2: `margin-left: 100px`, "built for *agents.*" — italic word uses gradient text-fill `linear-gradient(180deg, #b6f0d3 0%, #5fb085 55%, #3d8a65 100%)` + `drop-shadow(0 0 24px rgba(95,176,133,0.35))`.
- Hairline rule (max-width 720px), then a 2-column foot:
  - Body (16.5px, ink-soft): "Strata is the API and MCP server for the moving parts of the AI ecosystem — **best practices, releases, integrations, and signal** — verified, dated, and shaped for the agents reading it."
  - CTA cluster: emerald button "get api key →" + ghost button "read the docs".

### 3. Ecosystems ("Ecosystems we track")
- 5-column grid (collapses to 2 @ ≤980px). Each card glass + shimmer, padding `28px 20px 22px`, centered.
- 60×60 white-stroke SVG mark, drop-shadow.
- **The marks in the prototype are abstract originals** — they are *not* the actual brand logos. Keep abstract in production unless brand permission is in hand. Do **not** ship reproductions of Anthropic / OpenAI / Google / LangChain / Ollama marks without explicit approval.
- Below mark: name in display font 20px, then a "live" badge (mono uppercase, glass pill, animated pulsing dot).

### 4. Methods ("One endpoint. Four verbs.")
Section meta reads **"api/v1 · rest + mcp"**. Outer glass panel (padding 14px) wrapping 4 rows. Each row:
- 3-column grid `minmax(280px,360px) 1fr auto`, gap 28px, padding `22px 24px`
- **Left border 2px solid `--emerald-bright`**
- Hover: `background: rgba(255,255,255,0.04)`

The four rows verbatim (these are the same names as both REST endpoints and MCP tools):

| Function | Returns | Description | Params |
|---|---|---|---|
| `get_best_practices()` | `structured[]` | Canonical patterns and anti-patterns per ecosystem, ranked by recency and adoption. | `{ ecosystem, topic? }` |
| `get_latest_news()` | `news[]` | Releases, deprecations, and changelog deltas — sourced and dated, never paraphrased. | `{ since, limit? }` |
| `get_top_integrations()` | `ranked[]` | Tools, SDKs, and providers ordered by signal — usage, mentions, sustained activity. | `{ ecosystem, surface? }` |
| `search_ecosystem()` | `results[]` | Free-form semantic search across the indexed corpus, scoped to one ecosystem or all five. | `{ q, scope?, k? }` |

In the docs page (built later from this template), each row becomes a section with REST + MCP tabs. Reserve room in the row component design for that future split.

### 5. Pricing
- 2-column grid, gap 18px.
- Both cards: padding `38px 36px 32px`, radius 26px, hover `translateY(-3px)`.
- **Free**: glass + shimmer. `$0 / forever`. "Everything you need to wire up a prototype agent." Features: 100 calls/mo, 2 ecosystems, 24-hour news lag, weekly index refresh. CTA outline "start free →".
- **Pro**: solid emerald with sheen. `$29 / month`. "Production-grade access for teams shipping real agents." Features: 10,000 calls/mo, all ecosystems, real-time news stream, daily index refresh. CTA white-button "get pro access →" with emerald text.

### 6. Footer
- 22px-padded glass strip, radius 22px.
- Left: italic display 19px "knowledge that holds."
- Right: mono 12px tabular "strata.dev · docs · status" with separators in white-25%.

---

## Buttons (full spec)

| Variant | Background | Text | Border | Notes |
|---|---|---|---|---|
| `btn-emerald` | gradient: white-25% top sheen + `linear-gradient(180deg, #4fa57b → #3d8a65 → #2c6d4f)` | white | `rgba(255,255,255,0.30)` | Inner top-highlight + emerald drop-shadow at 28px. Use for primary CTAs. |
| `btn-ghost` | `rgba(255,255,255,0.05)` + `backdrop-blur(20px) saturate(180%)` | white | `rgba(255,255,255,0.20)` | Bg → 0.10 on hover. Use for secondary CTAs near emerald primary. |
| `btn-white` | `linear-gradient(180deg, #fff → #f0f1ee)` | `#2d6a4f` (emerald) | `rgba(255,255,255,0.6)` | Weight 600. Use only on emerald-filled surfaces (Pro card). |
| `btn-outline` | `rgba(255,255,255,0.02)` + `backdrop-blur(12px)` | white | `rgba(255,255,255,0.30)` | Bg → 0.07 / border → 0.50 on hover. Use as the secondary CTA on glass surfaces. |

All: pill, padding `11px 18px`, sans 14px / weight 500. Hover: `translateY(-1px)`. Arrow span gets `translateX(3px)` on parent hover via `.btn:hover .btn-arrow`.

---

## Motion vocabulary

| Surface | Trigger | Effect | Timing |
|---|---|---|---|
| Live dot | always | `::after` ring scales 1 → 2.6, opacity 0.85 → 0 | 2s ease-in-out infinite |
| Glass card | hover | `translateY(-3px)` + brighter top/left borders | 320ms cubic-bezier(.2,.7,.2,1) |
| Glass card (`.shimmer`) | hover | white diagonal sweep via `::before` | 900ms cubic-bezier(.2,.7,.2,1) |
| Buttons | hover | `translateY(-1px)` + intensified shadow | 200–250ms |
| Button arrow | parent hover | `translateX(3px)` | 220ms |
| API row | hover | bg → `rgba(255,255,255,0.04)` | 220ms |
| Nav link | hover | color muted → white | 200ms |
| Stars | always | drift + twinkle (decorative) | 240–360s linear / 6s ease |

All decorative animation must be wrapped in `@media (prefers-reduced-motion: reduce)` to disable.

---

## Responsive
- **≤980px**: hero h1 → 52px (line 2 indent → 60px); ecosystems → 2 columns; API rows stack to 1 column (params left-align); pricing stacks; hero foot stacks; section h2 → 30px.
- **≤600px**: wrap padding 16px; hero h1 → 40px (line 2 indent → 28px); nav text links hidden (logo + CTA only); footer stacks vertically; hero/section vertical padding reduced.

## Accessibility
- All decorative animation gated by `prefers-reduced-motion: reduce`.
- `:focus-visible { outline: 2px solid var(--emerald-glow); outline-offset: 3px; border-radius: 4px; }` is global — keep the emerald-glow focus ring across all surfaces.
- Live badges should expose `aria-label="live"` if the dot is the only signal.
- Glass borders rely on translucency — verify body copy contrast (`rgba(255,255,255,0.62)`) renders ≥ AA against the actual rendered background; raise to `--ink-soft` (0.84) where needed.

## State management
None on this page. The "get api key" CTAs should route to the auth/key-issuance flow (likely a dashboard sub-route once that ships). Stub the route if it doesn't exist yet.

## Tweaks panel
The prototype includes an in-page Tweaks panel (`tweaks-panel.jsx`) for live design exploration. **Do not ship this in production.** It exists only so the designer can iterate. Strip both the panel mount, the React/Babel scripts, and `tweaks-panel.jsx` when porting.

## Files in this bundle
- `Strata Landing v2.html` — the design reference.
- `tweaks-panel.jsx` — design-time only (do not ship).
- `screenshots/` — section-by-section captures.
