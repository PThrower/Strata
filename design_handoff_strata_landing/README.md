# Handoff: Strata Landing Page

## Overview
Marketing landing page for **Strata** — an AI ecosystem intelligence API. Single long-scroll page with nav, hero, ecosystem cards, API method reference, pricing, and footer. Built around Apple's "Liquid Glass" visual language: translucent frosted panels floating over a deep emerald background.

## About the Design Files
The file in this bundle (`Strata Landing.html`) is a **design reference created in HTML** — a prototype showing the intended look, layout, type, and motion. It is **not** production code to copy directly.

Your task is to **recreate this design in the target codebase's existing environment** (Next.js / React / etc., per the codebase you're working in) using its established patterns, component library, and styling conventions. If no environment exists yet, pick the most appropriate framework and implement there. Lift the visual values (colors, type, spacing, glass treatment, motion) from this prototype; do not lift the markup verbatim.

## Fidelity
**High-fidelity.** Final colors, typography, spacing, motion, and component states. Recreate pixel-accurately.

---

## Global Foundations

### Color tokens
| Token | Value | Usage |
|---|---|---|
| `--bg-deep` | `#1a3d2d` | Base page background |
| `--bg-deeper` | `#102a1f` | Bottom of background gradient |
| `--emerald` | `#2d6a4f` | Brand primary, Pro card mid-tone, button text on white |
| `--emerald-bright` | `#3d8a65` | CTA buttons, API row left border, brand dot, italic accent |
| `--emerald-glow` | `#5fb085` | Italic gradient end, return-type code accent, check icons |
| `--ink` | `#ffffff` | Primary text on glass / emerald |
| `--ink-muted` | `rgba(255,255,255,0.62)` | Body copy, nav links |
| `--ink-faint` | `rgba(255,255,255,0.42)` | Eyebrows, params, footer right |
| `--hair` | `rgba(255,255,255,0.12)` | Standard divider |
| `--hair-strong` | `rgba(255,255,255,0.22)` | Glass border |

### Page background (layered, fixed)
```css
background:
  radial-gradient(80% 60% at 18% 12%, rgba(95,176,133,0.32) 0%, transparent 55%),
  radial-gradient(60% 55% at 88% 22%, rgba(61,138,101,0.26) 0%, transparent 60%),
  radial-gradient(70% 65% at 70% 88%, rgba(45,106,79,0.45) 0%, transparent 65%),
  radial-gradient(50% 45% at 8% 78%, rgba(40,92,68,0.4) 0%, transparent 60%),
  linear-gradient(180deg, #1a3d2d 0%, #143020 50%, #0e2418 100%);
```
Plus a fixed SVG fractal-noise overlay at `opacity: 0.7`, `mix-blend-mode: overlay` (see source).

### Typography
| Role | Stack |
|---|---|
| Headlines (serif) | `ui-serif, "New York", Georgia, "Times New Roman", serif` |
| Body / UI (sans) | `-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Helvetica, Arial, sans-serif` |
| Code / labels (mono) | `ui-monospace, "SF Mono", Menlo, Consolas, monospace` |

Apply globally:
```css
-webkit-font-smoothing: antialiased;
-moz-osx-font-smoothing: grayscale;
text-rendering: optimizeLegibility;
letter-spacing: -0.005em;
```

### Type scale (used)
- Hero headline: serif 64px, weight 400, line-height 1.04, tracking -0.025em
- Section heading (h2): serif 32px, weight 400, tracking -0.02em
- Price number: serif 52px, weight 400, tracking -0.02em
- Body: sans 16px / 1.6
- Eyebrow / section meta: mono 11.5px, tracking 0.16–0.18em, uppercase
- Nav link: sans 13.5px
- Button label: sans 13.5px, weight 500
- API fn / params: mono 14.5px / mono 11.5px

### Spacing & radii
- Page max-width: 1200px, horizontal padding 32px (16px on mobile)
- Section vertical padding: 64px
- Glass radii: 22px (nav, footer strip), 24px (default glass), 26px (price card), 14px (API row)
- Buttons: pill (`border-radius: 999px`), padding 10px 18px

### The Glass primitive
Used on nav, ecosystem cards, API panel, free price card, footer strip.

```css
.glass {
  background: linear-gradient(135deg,
    rgba(255,255,255,0.14) 0%,
    rgba(255,255,255,0.06) 40%,
    rgba(255,255,255,0.04) 100%);
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  border: 1px solid rgba(255,255,255,0.18);
  border-top-color: rgba(255,255,255,0.32);    /* light refraction top */
  border-left-color: rgba(255,255,255,0.28);   /* light refraction left */
  border-radius: 24px;
  box-shadow:
    inset 0  1px 0 0 rgba(255,255,255,0.35),    /* top specular */
    inset 1px 0 0 0 rgba(255,255,255,0.18),     /* left specular */
    inset 0 -1px 0 0 rgba(0,0,0,0.18),          /* bottom shade */
    0 18px 50px -20px rgba(0,0,0,0.55),
    0 2px 8px -2px rgba(0,0,0,0.25);
}
```

**Hover shimmer** (opt-in via `.shimmer` class on cards): a `::before` gradient sweeping from `-110%` to `110%` over 900ms cubic-bezier(.2,.7,.2,1) on hover. See source for exact gradient.

---

## Sections

### 1. Nav (sticky)
- Sticky at `top: 16px`, padded shell, `z-index: 50`
- Glass bar, height 64px, radius 22px, padding `0 22px 0 24px`
- **Left**: 9px emerald-bright dot with white inner ring + green glow (`box-shadow: 0 0 12px rgba(95,176,133,0.85), 0 0 24px rgba(95,176,133,0.45)`); "Strata" in serif 19px
- **Right**: "docs", "pricing" links (muted white → white on hover, 200ms); "get api key →" CTA (emerald button)
- Global reset `a { color: inherit; text-decoration: none; }` is required so nav links don't pick up UA blue

### 2. Hero
- Padding: `88px 0 56px`
- Eyebrow: mono uppercase "ai ecosystem intelligence — api" with a 28×1px white-35% rule prepended
- Headline (serif 64px):
  - Line 1: "Verified knowledge,"
  - Line 2: `margin-left: 100px`, "built for *agents.*" — "agents." is italic with a vertical gradient text-fill: `linear-gradient(180deg, #7fc9a3 0%, #5fb085 60%, #3d8a65 100%)`
- Hairline rule: `max-width: 720px`, gradient `rgba(255,255,255,0.28) → rgba(255,255,255,0.04)`
- Foot grid (`max-width: 920px`, two columns):
  - Body copy 16px/1.6, muted, max 480px
  - CTA cluster: emerald button + ghost button

### 3. Ecosystems ("Ecosystems we track")
- Section heading row: h2 left, mono meta right ("5 indexed · refreshed continuously")
- 5-column grid, gap 16px (collapses to 2-col under 980px)
- Each card: glass + shimmer, padding `26px 20px 20px`, centered content
- 60×60 SVG mark, white stroke (`rgba(255,255,255,0.92)`) at 2.0–2.4 stroke-width, with `drop-shadow(0 4px 12px rgba(0,0,0,0.35))`
- **Marks are abstract originals** — placeholder geometric glyphs (beacon triangle, 6-petal bloom, 4-point sparkle, interlocked rings, mountain peaks). When implementing in production, **replace with the real ecosystem brand marks per their usage guidelines**, or keep abstract if you don't have license to use them.
- Ecosystem name in serif 18px below mark
- Live badge: pill (`rgba(255,255,255,0.06)` bg, hairline border), 7px green dot `#6ddb9b` with green glow + a `::after` pulse animation:
  ```css
  @keyframes pulse {
    0%   { transform: scale(1);   opacity: 0.85; }
    70%  { transform: scale(2.4); opacity: 0; }
    100% { transform: scale(2.4); opacity: 0; }
  }
  ```
  2s ease-in-out infinite. Badge label: mono 10.5px uppercase "live"
- Card hover: `translateY(-2px)`, top/left border colors brighten, 280ms

### 4. API methods
- Section heading: "One endpoint. Four verbs." + meta "api/v1 · rest + sse"
- Outer glass panel, padding 14px
- 4 rows. Each row:
  - 3-column grid: `minmax(280px,360px) 1fr auto`, gap 28px, padding `22px 24px`
  - **Left border: 2px solid `var(--emerald-bright)`** (the spec-required emerald accent)
  - Border-radius 14px, hairline top divider between rows
  - Hover: `background: rgba(255,255,255,0.04)` (220ms)
- Row content:
  - **Function** (mono 14.5px): `get_best_practices()` then a faint `→` then return type in `--emerald-glow`
  - **Description** (sans 14px, muted)
  - **Params** (mono 11.5px, faint, right-aligned): e.g. `{ ecosystem, topic? }`

The four rows verbatim:
| Function | Returns | Description | Params |
|---|---|---|---|
| `get_best_practices()` | `structured[]` | Canonical patterns and anti-patterns per ecosystem, ranked by recency and adoption. | `{ ecosystem, topic? }` |
| `get_latest_news()` | `news[]` | Releases, deprecations, and changelog deltas — sourced and dated, never paraphrased. | `{ since, limit? }` |
| `get_top_integrations()` | `ranked[]` | Tools, SDKs, and providers ordered by signal — usage, mentions, sustained activity. | `{ ecosystem, surface? }` |
| `search_ecosystem()` | `results[]` | Free-form semantic search across the indexed corpus, scoped to one ecosystem or all five. | `{ q, scope?, k? }` |

### 5. Pricing
- 2-column grid, gap 18px (stacks under 980px)
- Both cards: padding `36px 36px 32px`, border-radius 26px, hover `translateY(-2px)`

**Free card** = `.glass.shimmer`
- Pill tag "Free" (mono 11px tracked, faint pill bg)
- `$0` (serif 52px) + `/ forever` (sans 15px muted, non-italic)
- Subline: "Everything you need to wire up a prototype agent."
- Feature list (each row: 16×16 emerald-glow check + label, hairline top border):
  - 100 calls / month
  - 2 ecosystems
  - 24-hour news lag
  - Weekly index refresh
- CTA: outline ghost button "start free →"

**Pro card** = solid emerald with glass sheen overlay
- Background: `linear-gradient(160deg, #3d8a65 0%, #2d6a4f 55%, #1f4f3a 100%)`
- `::before`: top-half white sheen `linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.06) 60%, transparent 100%)` clipped to top 55% with rounded top corners
- `::after`: blurred white radial highlight at top-left (`top: -40%; left: -10%; 60%×80%`, `filter: blur(8px)`)
- Pill tag "Pro" with brighter pill bg (`rgba(255,255,255,0.18)`)
- `$29` (serif 52px white) + `/ month` (sans 15px, white at 75%)
- Subline: "Production-grade access for teams shipping real agents."
- Feature list (white text, white-30% top hairlines, light-mint check `#d4f5e2`):
  - 10,000 calls / month
  - All ecosystems
  - Real-time news stream
  - Daily index refresh
- CTA: `.btn-white` — white→#f1f1ee gradient, **emerald (#2d6a4f) text**, font-weight 600

### 6. Footer
- Margin-top 80px
- Glass strip, padding `20px 28px`, radius 22px
- Left: serif italic 17px "knowledge that holds."
- Right: mono 12px tracked "strata.dev · docs · status" with separators in white-28%
- Stacks to column under 600px

---

## Buttons (full spec)

`.btn` base: pill, padding 10px 18px, sans 13.5px / weight 500, gap 8px (icon+label), transition transform/box-shadow/background 200–250ms. Hover: `translateY(-1px)`. Arrow span gets `translateX(3px)` on parent hover.

| Variant | Background | Text | Border | Notable |
|---|---|---|---|---|
| `btn-emerald` | linear-gradient(180deg, #4ea077 → #3d8a65 → #2f7150) | white | `rgba(255,255,255,0.28)` | Top-half white-35% sheen `::after`; large emerald drop-shadow |
| `btn-ghost` | `rgba(255,255,255,0.06)` + backdrop-blur(18px) saturate(180%) | white | `rgba(255,255,255,0.22)` | Bg → 0.12 on hover |
| `btn-white` | linear-gradient(180deg, #fff → #f1f1ee) | `#2d6a4f` (emerald) | `rgba(255,255,255,0.6)` | Weight 600 |
| `btn-outline` | transparent | white | `rgba(255,255,255,0.32)` | Bg → `rgba(255,255,255,0.06)` on hover |

---

## Interactions & motion

| Surface | Trigger | Effect | Timing |
|---|---|---|---|
| Live dot | always | scale 1 → 2.4, opacity 0.85 → 0 (`::after` ring) | 2s ease-in-out infinite |
| Glass card | hover | `translateY(-2px)` + brighter top/left borders | 280ms cubic-bezier(.2,.7,.2,1) |
| Glass card (`.shimmer`) | hover | white diagonal gradient sweeps L→R via `::before` | 900ms cubic-bezier(.2,.7,.2,1) |
| Buttons | hover | `translateY(-1px)` + intensified shadow | 200–250ms |
| Button arrow span | parent hover | `translateX(3px)` | 220ms |
| API row | hover | bg `rgba(255,255,255,0.04)` | 220ms |
| Nav link | hover | color muted → white | 200ms |

No JS interactivity needed for this page — everything is CSS-driven. If your framework lazy-loads sections, fine; nothing depends on hydration.

---

## State management
None on this page. It is fully static marketing content. The "get api key" CTAs should route to the auth/signup flow that exists in the app; if it doesn't yet, stub a route.

---

## Responsive breakpoints
- **≤980px**: hero headline drops to 48px, line-2 indent to 60px; eco-grid becomes 2 columns; API row stacks to 1 column (params left-align); pricing stacks to 1 column; hero foot stacks
- **≤600px**: wrap padding 16px; hero headline 38px, line-2 indent 28px; nav text links hide (only logo + CTA visible); footer strip stacks vertically

---

## Assets
- **No external assets**. All visuals are CSS gradients + inline SVG.
- The five ecosystem SVGs are abstract placeholders. **In production, swap for the actual brand marks** (Anthropic, OpenAI, Google Gemini, LangChain, Ollama) per each company's brand guidelines and licensing — or keep abstract if licensing is in question.
- The background grain noise is an inline SVG `feTurbulence` data-URL (no external file).

---

## Accessibility notes
- Pulse animation on live dots is purely decorative; consider wrapping with `@media (prefers-reduced-motion: reduce)` and disabling the keyframe in production.
- Live badges should expose `aria-label="live"` if the dot is the only indicator.
- Glass borders rely on translucency — verify contrast of muted body copy (`rgba(255,255,255,0.62)`) against the actual rendered background on production. It tested fine here but may shift if the page bg darkens.
- All interactive elements are real anchors/buttons; ensure focus-visible rings are added in your codebase (the prototype omits them for cleanliness — you should NOT).

---

## Files in this bundle
- `Strata Landing.html` — the design reference. Open in a browser to inspect; use DevTools to read computed values directly off any element.
- `screenshots/` — section-by-section captures for quick visual reference:
  - `01-hero.png` — nav + hero
  - `02-ecosystems.png` — ecosystem cards
  - `03-api-methods.png` — API methods panel
  - `04-pricing.png` — Free + Pro cards
  - `05-footer.png` — footer strip
