'use client'

type Eco = { slug: string; name: string; vendor: string; color: string }

const ECOSYSTEMS: Eco[] = [
  { slug: 'claude',      name: 'Claude',      vendor: 'Anthropic',        color: '#D97706' },
  { slug: 'openai',      name: 'ChatGPT',     vendor: 'OpenAI',           color: '#10B981' },
  { slug: 'gemini',      name: 'Gemini',      vendor: 'Google',           color: '#3B82F6' },
  { slug: 'langchain',   name: 'LangChain',   vendor: 'LangChain',        color: '#8B5CF6' },
  { slug: 'ollama',      name: 'Ollama',      vendor: 'Ollama',           color: '#6B7280' },
  { slug: 'cursor',      name: 'Cursor',      vendor: 'Anysphere',        color: 'rgba(255,255,255,0.72)' },
  { slug: 'claudecode',  name: 'Claude Code', vendor: 'Anthropic',        color: '#D97706' },
  { slug: 'windsurf',    name: 'Windsurf',    vendor: 'Codeium',          color: '#06B6D4' },
  { slug: 'copilot',     name: 'Copilot',     vendor: 'Microsoft',        color: '#F59E0B' },
  { slug: 'cody',        name: 'Cody',        vendor: 'Sourcegraph',      color: '#EF4444' },
  { slug: 'perplexity',  name: 'Perplexity',  vendor: 'Perplexity',       color: 'rgba(255,255,255,0.72)' },
  { slug: 'youcom',      name: 'You.com',     vendor: 'You.com',          color: '#6366F1' },
  { slug: 'exa',         name: 'Exa',         vendor: 'Exa',              color: '#10B981' },
  { slug: 'replicate',   name: 'Replicate',   vendor: 'Replicate',        color: 'rgba(255,255,255,0.72)' },
  { slug: 'togetherai',  name: 'Together AI', vendor: 'Together',         color: '#F97316' },
  { slug: 'groq',        name: 'Groq',        vendor: 'Groq',             color: '#F97316' },
  { slug: 'fireworks',   name: 'Fireworks',   vendor: 'Fireworks AI',     color: '#EF4444' },
  { slug: 'manus',       name: 'Manus',       vendor: 'Butterfly Effect', color: '#3B82F6' },
  { slug: 'higgsfield',  name: 'Higgsfield',  vendor: 'Higgsfield AI',    color: '#EC4899' },
  { slug: 'v0',          name: 'v0',          vendor: 'Vercel',           color: 'rgba(255,255,255,0.72)' },
  { slug: 'bolt',        name: 'Bolt',        vendor: 'StackBlitz',       color: '#F59E0B' },
]

function Tile({ name, vendor, color }: { name: string; vendor: string; color: string }) {
  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.08)',
      backdropFilter: 'blur(12px) saturate(180%)',
      WebkitBackdropFilter: 'blur(12px) saturate(180%)',
      border: '1px solid rgba(255, 255, 255, 0.18)',
      borderRadius: 20,
      padding: '16px 20px',
      minWidth: 148,
      flexShrink: 0,
      boxShadow: [
        '0 0 0 0.5px rgba(255,255,255,0.3)',
        'inset 0 0.5px 0 rgba(255,255,255,0.4)',
        'inset 0 -0.5px 0 rgba(0,0,0,0.1)',
        '0 4px 24px rgba(0,0,0,0.06)',
        '0 1px 2px rgba(0,0,0,0.04)',
      ].join(', '),
    }}>
      <span style={{
        display: 'block',
        width: 28, height: 28, borderRadius: '50%',
        background: color,
        boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
        marginBottom: 10,
        flexShrink: 0,
      }} />
      <p style={{
        fontFamily: 'var(--font-serif)',
        fontSize: 14, fontWeight: 400, color: 'rgba(255,255,255,0.90)',
        margin: '0 0 3px', lineHeight: 1.2,
      }}>
        {name}
      </p>
      <p style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 9, color: 'rgba(255,255,255,0.40)',
        margin: 0, letterSpacing: '0.06em',
      }}>
        {vendor}
      </p>
    </div>
  )
}

export function EcosystemCarousel() {
  // Duplicate twice for seamless looping; paddingRight = gap fixes the -50% translate offset
  const tiles = [...ECOSYSTEMS, ...ECOSYSTEMS]

  return (
    <div style={{
      overflow: 'hidden',
      maskImage: 'linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)',
      WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Row 1 — scrolls left */}
        <div
          className="carousel-row"
          style={{ gap: 12, paddingRight: 12, animation: 'marquee-left 40s linear infinite' }}
        >
          {tiles.map((eco, i) => (
            <Tile key={`r1-${i}`} name={eco.name} vendor={eco.vendor} color={eco.color} />
          ))}
        </div>
        {/* Row 2 — scrolls right */}
        <div
          className="carousel-row"
          style={{ gap: 12, paddingRight: 12, animation: 'marquee-right 40s linear infinite' }}
        >
          {tiles.map((eco, i) => (
            <Tile key={`r2-${i}`} name={eco.name} vendor={eco.vendor} color={eco.color} />
          ))}
        </div>
      </div>
    </div>
  )
}
