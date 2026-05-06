# Strata Dashboard — Design Specification for Claude Code

> **This is a contract, not a guideline.** Every value here is exact.
> Use these tokens verbatim. Do not invent colors, sizes, or shadows.

---

## 1. EXACT STYLE VALUES

### 1.1 CSS Variables (drop into `:root` of the global stylesheet)

```css
:root {
  /* Brand */
  --emerald:        #00c472;   /* primary accent — buttons, active, success, brand mark */
  --emerald-glow:   #5fb085;   /* secondary green */
  --emerald-deep:   #0d4f30;   /* dark green for badges/fills */
  --emerald-light:  #9be0bd;   /* lightest green */

  /* Surfaces */
  --void:           #080a12;   /* page background */
  --void-2:         #0a0e1c;   /* alt deep */
  --surface:        #0d1120;   /* solid card fallback */
  --surface-2:      #131831;   /* hover surface */
  --border:         #1a2540;   /* card stroke */

  /* Ink */
  --white:          #ffffff;
  --ink-soft:       rgba(255,255,255,0.84);
  --ink-muted:      rgba(255,255,255,0.62);
  --ink-faint:      rgba(255,255,255,0.42);
  --muted:          #888888;
  --secondary-text: #6b7280;

  /* Hairlines */
  --hair:           rgba(255,255,255,0.10);
  --hair-strong:    rgba(255,255,255,0.20);

  /* Risk semantic */
  --risk-low:       #00c472;
  --risk-medium:    #f5b042;
  --risk-high:      #ff7a45;
  --risk-critical:  #ef4444;
  --risk-unknown:   #6b7280;

  /* Type */
  --font-sans:   "Inter", -apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", Helvetica, Arial, sans-serif;
  --font-serif:  "Instrument Serif", ui-serif, "New York", Georgia, serif;
  --font-mono:   "JetBrains Mono", ui-monospace, "SF Mono", "SFMono-Regular", Menlo, Consolas, monospace;

  /* Radii */
  --radius-sm:   8px;
  --radius-md:   14px;
  --radius-lg:   22px;
  --radius-pill: 999px;

  /* Spacing scale (use these, not arbitrary px) */
  --space-1:  4px;
  --space-2:  8px;
  --space-3:  12px;
  --space-4:  16px;
  --space-5:  20px;
  --space-6:  24px;
  --space-7:  32px;
  --space-8:  40px;
  --space-9:  56px;
  --space-10: 72px;
}
```

### 1.2 Liquid Glass — exact values

| Property | Value |
|---|---|
| `background` | `linear-gradient(135deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 35%, rgba(255,255,255,0.02) 70%, rgba(0,196,114,0.05) 100%)` |
| `backdrop-filter` | `blur(28px) saturate(180%)` |
| `-webkit-backdrop-filter` | `blur(28px) saturate(180%)` |
| `border` | `1px solid rgba(255,255,255,0.10)` |
| `border-top-color` | `rgba(255,255,255,0.28)` |
| `border-left-color` | `rgba(255,255,255,0.20)` |
| `border-radius` | `22px` |
| `box-shadow` | `inset 0 1px 0 0 rgba(255,255,255,0.30), inset 1px 0 0 0 rgba(255,255,255,0.14), inset 0 -1px 0 0 rgba(0,0,0,0.30), inset 0 0 36px 0 rgba(0,196,114,0.04), 0 24px 60px -24px rgba(0,0,0,0.7), 0 4px 14px -4px rgba(0,0,0,0.4)` |

Hover (delta only):
- `border-top-color: rgba(255,255,255,0.45)`
- `transform: translateY(-2px)`
- `transition: transform 320ms cubic-bezier(.2,.7,.2,1), border-color 320ms`

---

## 2. COMPONENT SPECS — Inline Style Objects

Use these `style={{}}` objects **verbatim**.

### 2.1 GlassCard

```jsx
const glassCardStyle = {
  position: 'relative',
  background: 'linear-gradient(135deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 35%, rgba(255,255,255,0.02) 70%, rgba(0,196,114,0.05) 100%)',
  backdropFilter: 'blur(28px) saturate(180%)',
  WebkitBackdropFilter: 'blur(28px) saturate(180%)',
  border: '1px solid rgba(255,255,255,0.10)',
  borderTopColor: 'rgba(255,255,255,0.28)',
  borderLeftColor: 'rgba(255,255,255,0.20)',
  borderRadius: '22px',
  boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.30), inset 1px 0 0 0 rgba(255,255,255,0.14), inset 0 -1px 0 0 rgba(0,0,0,0.30), inset 0 0 36px 0 rgba(0,196,114,0.04), 0 24px 60px -24px rgba(0,0,0,0.7), 0 4px 14px -4px rgba(0,0,0,0.4)',
  padding: '24px 28px',
  transition: 'transform 320ms cubic-bezier(.2,.7,.2,1), border-color 320ms',
};

const glassCardHoverStyle = {
  ...glassCardStyle,
  borderTopColor: 'rgba(255,255,255,0.45)',
  transform: 'translateY(-2px)',
};
```

### 2.2 RiskBadge (low / medium / high / critical / unknown)

```jsx
const riskBadgeBase = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  padding: '4px 10px',
  borderRadius: '999px',
  fontFamily: 'var(--font-mono)',
  fontSize: '10.5px',
  fontWeight: 500,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  border: '1px solid',
  whiteSpace: 'nowrap',
};

const riskBadgeStyles = {
  low:      { ...riskBadgeBase, color: '#00c472', background: 'rgba(0,196,114,0.10)',  borderColor: 'rgba(0,196,114,0.32)' },
  medium:   { ...riskBadgeBase, color: '#f5b042', background: 'rgba(245,176,66,0.10)', borderColor: 'rgba(245,176,66,0.32)' },
  high:     { ...riskBadgeBase, color: '#ff7a45', background: 'rgba(255,122,69,0.10)', borderColor: 'rgba(255,122,69,0.32)' },
  critical: { ...riskBadgeBase, color: '#ffffff', background: 'rgba(239,68,68,0.85)',  borderColor: 'rgba(239,68,68,1)' },
  unknown:  { ...riskBadgeBase, color: '#888888', background: 'rgba(136,136,136,0.10)',borderColor: 'rgba(136,136,136,0.30)' },
};
// usage: <span style={riskBadgeStyles[level]}>● {level}</span>
```

### 2.3 StatusChip (emerald / amber / red / zinc)

```jsx
const statusChipBase = {
  display: 'inline-flex', alignItems: 'center', gap: '7px',
  padding: '5px 11px 5px 9px',
  borderRadius: '999px',
  fontFamily: 'var(--font-mono)',
  fontSize: '10.5px', fontWeight: 500,
  letterSpacing: '0.18em', textTransform: 'uppercase',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.14)',
};
const statusChipStyles = {
  emerald: { ...statusChipBase, color: 'rgba(255,255,255,0.85)' },   // dot color overrides
  amber:   { ...statusChipBase, color: 'rgba(255,255,255,0.85)' },
  red:     { ...statusChipBase, color: 'rgba(255,255,255,0.85)' },
  zinc:    { ...statusChipBase, color: 'rgba(255,255,255,0.65)' },
};
const statusDotColor = {
  emerald: '#00c472', amber: '#f5b042', red: '#ef4444', zinc: '#888888',
};
// usage:
// <span style={statusChipStyles.emerald}>
//   <span style={{width:7,height:7,borderRadius:'50%',background:statusDotColor.emerald,boxShadow:'0 0 10px rgba(0,196,114,0.9)'}}/>
//   live
// </span>
```

### 2.4 PageHeading

```jsx
const pageHeadingStyle = {
  fontFamily: 'var(--font-serif)',
  fontSize: '44px',
  fontWeight: 400,
  lineHeight: 1.05,
  letterSpacing: '-0.022em',
  color: '#ffffff',
  margin: '0 0 8px',
};
```

### 2.5 SectionEyebrow (with hairline)

```jsx
const sectionEyebrowStyle = {
  display: 'flex', alignItems: 'center', gap: '14px',
  fontFamily: 'var(--font-mono)',
  fontSize: '11px', fontWeight: 500,
  letterSpacing: '0.18em', textTransform: 'uppercase',
  color: '#00c472',
  margin: '0 0 24px',
};
const sectionEyebrowHairlineStyle = {
  flex: 1, height: '1px', background: 'rgba(0,196,114,0.18)',
};
// usage:
// <div style={sectionEyebrowStyle}>
//   01 — Capabilities
//   <span style={sectionEyebrowHairlineStyle} />
// </div>
```

### 2.6 DataTable — row & header

```jsx
const tableStyle = {
  width: '100%', borderCollapse: 'separate', borderSpacing: 0,
  fontFamily: 'var(--font-mono)',
};
const tableHeaderCellStyle = {
  textAlign: 'left',
  padding: '14px 16px',
  fontFamily: 'var(--font-mono)',
  fontSize: '10.5px', fontWeight: 500,
  letterSpacing: '0.18em', textTransform: 'uppercase',
  color: 'rgba(255,255,255,0.42)',
  borderBottom: '1px solid rgba(255,255,255,0.10)',
  background: 'transparent',
};
const tableRowStyle = {
  transition: 'background 180ms',
};
const tableCellStyle = {
  padding: '16px',
  fontFamily: 'var(--font-mono)',
  fontSize: '13px', fontWeight: 400,
  color: 'rgba(255,255,255,0.84)',
  borderBottom: '1px solid rgba(255,255,255,0.06)',
  verticalAlign: 'middle',
};
// row hover: background 'rgba(255,255,255,0.04)'
```

### 2.7 ActionButton (primary + ghost)

```jsx
const buttonBase = {
  display: 'inline-flex', alignItems: 'center', gap: '8px',
  padding: '11px 18px',
  borderRadius: '999px',
  fontFamily: 'var(--font-sans)',
  fontSize: '14px', fontWeight: 500, lineHeight: 1,
  letterSpacing: '-0.005em',
  cursor: 'pointer',
  border: '1px solid transparent',
  transition: 'transform 220ms ease, box-shadow 250ms ease, background 200ms',
  whiteSpace: 'nowrap',
};
const buttonPrimaryStyle = {
  ...buttonBase,
  background: 'linear-gradient(180deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0) 50%), linear-gradient(180deg, #4fa57b 0%, #00c472 50%, #0d4f30 100%)',
  color: '#ffffff',
  borderColor: 'rgba(255,255,255,0.30)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -1px 0 rgba(0,0,0,0.25), 0 10px 28px -8px rgba(0,196,114,0.75), 0 0 0 1px rgba(0,0,0,0.4)',
};
const buttonGhostStyle = {
  ...buttonBase,
  background: 'rgba(255,255,255,0.05)',
  color: '#ffffff',
  borderColor: 'rgba(255,255,255,0.20)',
  backdropFilter: 'blur(20px) saturate(180%)',
  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18), 0 4px 14px -6px rgba(0,0,0,0.4)',
};
```

### 2.8 CapabilityFlagChip (dangerous + safe)

```jsx
const capabilityChipBase = {
  display: 'inline-flex', alignItems: 'center', gap: '6px',
  padding: '4px 9px',
  borderRadius: '6px',
  fontFamily: 'var(--font-mono)',
  fontSize: '11px', fontWeight: 500,
  letterSpacing: '0.04em',
  border: '1px solid',
};
const capabilityChipStyles = {
  dangerous: { ...capabilityChipBase, color: '#ff7a45', background: 'rgba(255,122,69,0.08)', borderColor: 'rgba(255,122,69,0.30)' },
  safe:      { ...capabilityChipBase, color: '#00c472', background: 'rgba(0,196,114,0.08)',  borderColor: 'rgba(0,196,114,0.30)' },
};
// usage: <span style={capabilityChipStyles.dangerous}>fs:write</span>
```

### 2.9 Modal / slide-in panel

```jsx
const modalBackdropStyle = {
  position: 'fixed', inset: 0, zIndex: 100,
  background: 'rgba(4,5,12,0.65)',
  backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
};
const modalPanelStyle = {
  // slide in from the right
  position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 101,
  width: 'min(560px, 92vw)',
  background: 'linear-gradient(135deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 35%, rgba(0,196,114,0.05) 100%)',
  backdropFilter: 'blur(40px) saturate(190%)',
  WebkitBackdropFilter: 'blur(40px) saturate(190%)',
  borderLeft: '1px solid rgba(255,255,255,0.16)',
  boxShadow: '-30px 0 80px -20px rgba(0,0,0,0.7)',
  padding: '32px',
  overflowY: 'auto',
  transform: 'translateX(0)',
  transition: 'transform 280ms cubic-bezier(.2,.7,.2,1)',
};
// closed: transform: 'translateX(100%)'
```

---

## 3. TYPOGRAPHY RULES

| Role | fontFamily | fontSize | fontWeight | letterSpacing | lineHeight | color |
|---|---|---|---|---|---|---|
| Page title | `var(--font-serif)` | `44px` | 400 | `-0.022em` | 1.05 | `#ffffff` |
| Section heading | `var(--font-serif)` | `28px` | 400 | `-0.018em` | 1.15 | `#ffffff` |
| Card title | `var(--font-sans)` | `16px` | 600 | `-0.005em` | 1.3 | `#ffffff` |
| Eyebrow | `var(--font-mono)` | `11px` | 500 | `0.18em` UPPER | 1 | `#00c472` |
| Table header | `var(--font-mono)` | `10.5px` | 500 | `0.18em` UPPER | 1 | `rgba(255,255,255,0.42)` |
| Table data | `var(--font-mono)` | `13px` | 400 | 0 | 1.5 | `rgba(255,255,255,0.84)` |
| Badge | `var(--font-mono)` | `10.5px` | 500 | `0.14em` UPPER | 1 | (semantic) |
| Body | `var(--font-sans)` | `14.5px` | 400 | `-0.005em` | 1.55 | `rgba(255,255,255,0.84)` |
| Muted | `var(--font-sans)` | `13px` | 400 | 0 | 1.5 | `rgba(255,255,255,0.62)` |
| Stat number | `var(--font-serif)` | `40px` | 400 | `-0.02em` | 1 | `#ffffff` |

---

## 4. LAYOUT RULES

### Top nav
- Sticky, `top: 16px`, z-index 50
- Height `64px`, padding `0 14px 0 22px`
- Glass card styling (see §1.2), `border-radius: 22px`
- Max-width `1280px`, centered

### Page
- Page max-width: `1280px`
- Page side padding: `32px` (desktop), `16px` (mobile <600px)
- Vertical section spacing: `72px` between top-level sections
- Card grid gap: `18px`
- Card inner padding: `24px 28px` (default), `32px 36px` (feature card)

### Border-radius scale
- Pills/chips/buttons: `999px`
- Inputs / small elements: `8px`
- Cards / modals: `22px`
- Inner panels nested in glass cards: `14px`

---

## 5. PATTERN EXAMPLES

### 5.1 Dashboard page wrapper with space backdrop

```jsx
function DashboardShell({ children }) {
  return (
    <div style={{ minHeight: '100vh', background: '#080a12', color: '#ffffff', position: 'relative', overflowX: 'hidden' }}>
      {/* atmosphere */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: -3,
        background: 'radial-gradient(120% 80% at 50% 0%, #0e1430 0%, #07091a 40%, #04050c 80%)'
      }} />
      <div style={{
        position: 'fixed', inset: 0, zIndex: -2, pointerEvents: 'none', filter: 'blur(20px)',
        background: 'radial-gradient(45% 38% at 18% 22%, rgba(0,196,114,0.22) 0%, transparent 70%), radial-gradient(60% 45% at 82% 78%, rgba(45,106,79,0.28) 0%, transparent 70%)'
      }} />
      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px' }}>
        {children}
      </main>
    </div>
  );
}
```

### 5.2 4-chip stats row

```jsx
function StatsRow({ stats }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '18px', marginBottom: '32px' }}>
      {stats.map(s => (
        <div key={s.label} style={glassCardStyle}>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 500,
            letterSpacing: '0.18em', textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.42)', marginBottom: '12px',
          }}>{s.label}</div>
          <div style={{
            fontFamily: 'var(--font-serif)', fontSize: '40px', fontWeight: 400,
            letterSpacing: '-0.02em', lineHeight: 1, color: '#ffffff',
          }}>{s.value}</div>
          {s.delta && (
            <div style={{
              marginTop: '10px', fontFamily: 'var(--font-mono)', fontSize: '11.5px',
              color: s.delta > 0 ? '#00c472' : '#ff7a45',
            }}>{s.delta > 0 ? '↑' : '↓'} {Math.abs(s.delta)}%</div>
          )}
        </div>
      ))}
    </div>
  );
}
```

### 5.3 Glass card with header / content / footer

```jsx
function GlassCard({ title, eyebrow, children, footer }) {
  return (
    <section style={{ ...glassCardStyle, padding: '28px 32px' }}>
      {eyebrow && (
        <div style={sectionEyebrowStyle}>
          {eyebrow}
          <span style={sectionEyebrowHairlineStyle} />
        </div>
      )}
      {title && (
        <h2 style={{
          fontFamily: 'var(--font-serif)', fontSize: '28px', fontWeight: 400,
          letterSpacing: '-0.018em', lineHeight: 1.15,
          color: '#ffffff', margin: '0 0 20px',
        }}>{title}</h2>
      )}
      <div style={{
        fontFamily: 'var(--font-sans)', fontSize: '14.5px',
        color: 'rgba(255,255,255,0.84)', lineHeight: 1.55,
      }}>{children}</div>
      {footer && (
        <div style={{
          marginTop: '24px', paddingTop: '20px',
          borderTop: '1px solid rgba(255,255,255,0.10)',
          display: 'flex', justifyContent: 'flex-end', gap: '12px',
        }}>{footer}</div>
      )}
    </section>
  );
}
```

### 5.4 Empty state

```jsx
function EmptyState({ title, body, action }) {
  return (
    <div style={{
      ...glassCardStyle,
      padding: '64px 32px',
      textAlign: 'center',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
    }}>
      <div style={{
        width: '48px', height: '48px', borderRadius: '14px',
        background: 'rgba(0,196,114,0.10)',
        border: '1px solid rgba(0,196,114,0.28)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--font-mono)', fontSize: '20px', color: '#00c472',
        marginBottom: '8px',
      }}>∅</div>
      <h3 style={{
        fontFamily: 'var(--font-serif)', fontSize: '22px', fontWeight: 400,
        letterSpacing: '-0.015em', color: '#ffffff', margin: 0,
      }}>{title}</h3>
      <p style={{
        fontFamily: 'var(--font-sans)', fontSize: '14px',
        color: 'rgba(255,255,255,0.62)', margin: '0 0 8px', maxWidth: '420px',
      }}>{body}</p>
      {action}
    </div>
  );
}
```

### 5.5 Data table with risk badges

```jsx
function MCPServerTable({ rows }) {
  return (
    <div style={{ ...glassCardStyle, padding: '8px 12px' }}>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={tableHeaderCellStyle}>Server</th>
            <th style={tableHeaderCellStyle}>Capabilities</th>
            <th style={tableHeaderCellStyle}>Risk</th>
            <th style={tableHeaderCellStyle}>Last Seen</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id} style={tableRowStyle}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <td style={{ ...tableCellStyle, color: '#ffffff' }}>{r.name}</td>
              <td style={tableCellStyle}>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {r.caps.map(c => (
                    <span key={c.name} style={capabilityChipStyles[c.kind]}>{c.name}</span>
                  ))}
                </div>
              </td>
              <td style={tableCellStyle}>
                <span style={riskBadgeStyles[r.risk]}>● {r.risk}</span>
              </td>
              <td style={{ ...tableCellStyle, color: 'rgba(255,255,255,0.62)' }}>{r.lastSeen}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

## 6. CLAUDE CODE RULES — READ THIS

**These rules are non-negotiable. Violating them breaks brand consistency.**

1. **Never use Tailwind color classes.** Not `bg-zinc-900`, not `text-emerald-500`, not `border-white/10`. Always use the CSS variables in §1.1 or the inline style objects in §2. If a Tailwind utility helps with layout (`flex`, `grid`, `gap-4`), it's allowed — but **all colors come from variables**.

2. **Always use `var(--font-mono)` for**: data values, table content, table headers, navigation links, eyebrows, badges, chips, capability flags, anything code-like, hex codes, IDs, timestamps, metric labels.

3. **Always use `var(--font-serif)` for**: page titles, section headings, card titles, large stat numbers, the brand wordmark in display contexts. Never use serif for body, table data, or chips.

4. **Always use `var(--font-sans)` for**: body copy, buttons, descriptions, paragraph text. Never for tables or eyebrows.

5. **Cards must be semi-transparent.** The space backdrop has to show through. Never set a card background to a solid color like `#0d1120` unless you are explicitly building a print/PDF-only fallback. Use the gradient + `backdrop-filter` from §1.2.

6. **Always import and use the shared `RiskBadge` component.** Do not re-implement risk pills inline. Import from `components/RiskBadge.jsx`. Same rule for `StatusChip`, `CapabilityFlagChip`, `GlassCard`.

7. **Glass effect requires `backdrop-filter: blur()`.** If you find yourself writing `background: '#0d1120'` on a card, stop — you're doing it wrong. The look depends on real backdrop blur over the nebula.

8. **Accent color is `#00c472` — only use it for**:
   - Primary buttons
   - Active nav state
   - Success indicators
   - Brand mark / logo
   - Eyebrows
   - "low risk" / "safe" semantic
   - Selected row left-border
   Do **not** use it for body text, generic links, hover backgrounds, or borders.

9. **Spacing uses the scale in §1.1.** No `padding: 13px` or `margin: 27px`. Round to the nearest scale step.

10. **Border-radius is one of: 8 / 14 / 22 / 999.** No `12px`, no `16px`, no `20px`. Pick from the scale in §4.

11. **Hover states are `translateY(-2px) + brighter top border` only.** Do not change card background or add box-shadow on hover. The interaction is subtle.

12. **Risk colors are reserved.** `#f5b042` (amber) only for "medium". `#ff7a45` (orange) only for "high" / "dangerous". `#ef4444` (red) only for "critical". Never use these for decoration.

13. **Tables are always inside a `GlassCard`** with `padding: '8px 12px'` on the wrapper, not the default card padding. The table provides its own row spacing.

14. **No emojis.** Use mono glyphs (`●`, `→`, `↑`, `↓`, `∅`) or SVG icons. Never `🟢` or `⚠️`.

15. **No drop-shadow on text** unless it's the brand mark on the hero. Body text stays flat.

---

**End of spec. When in doubt, copy a style object from §2 verbatim.**
