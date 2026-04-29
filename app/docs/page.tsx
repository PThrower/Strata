'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

// ─── Brand ──────────────────────────────────────────────────────────────────
const ACCENT = '#00c472'
const CODE_BG = '#0d1117'
const CODE_FG = '#e6edf3'
const SYN = { str: '#a5d6ff', kw: '#ff7b72', cmt: '#8b949e', num: '#79c0ff', prop: '#d2a8ff' }

// ─── Syntax highlighting ─────────────────────────────────────────────────────
type HlPat = { re: RegExp; color?: string }

function buildNodes(code: string, patterns: HlPat[]): React.ReactNode[] {
  const sticky = patterns.map(({ re, color }) => ({
    re: new RegExp(re.source, 'y'),
    color,
  }))
  const nodes: React.ReactNode[] = []
  let i = 0, k = 0, plain = ''
  while (i < code.length) {
    let hit = false
    for (const { re, color } of sticky) {
      re.lastIndex = i
      const m = re.exec(code)
      if (m) {
        if (plain) { nodes.push(plain); plain = '' }
        nodes.push(color ? <span key={k++} style={{ color }}>{m[0]}</span> : m[0])
        i += m[0].length
        hit = true
        break
      }
    }
    if (!hit) plain += code[i++]
  }
  if (plain) nodes.push(plain)
  return nodes
}

const JP: HlPat[] = [
  { re: /"(?:[^"\\]|\\.)*"(?=\s*:)/, color: SYN.prop },
  { re: /"(?:[^"\\]|\\.)*"/, color: SYN.str },
  { re: /true|false|null/, color: SYN.kw },
  { re: /-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/, color: SYN.num },
]
const BP: HlPat[] = [
  { re: /#[^\n]*/, color: SYN.cmt },
  { re: /"(?:[^"\\]|\\.)*"/, color: SYN.str },
  { re: /'[^']*'/, color: SYN.str },
  { re: /--?[a-zA-Z][\w-]*/, color: SYN.kw },
]
const PP: HlPat[] = [
  { re: /#[^\n]*/, color: SYN.cmt },
  { re: /"(?:[^"\\]|\\.)*"/, color: SYN.str },
  { re: /'(?:[^'\\]|\\.)*'/, color: SYN.str },
  { re: /\b(?:import|from|def|class|if|else|elif|return|for|in|while|try|except|with|as|not|and|or|True|False|None|await|async|print|time)\b/, color: SYN.kw },
  { re: /\b\d+(?:\.\d+)?\b/, color: SYN.num },
]
const JSP: HlPat[] = [
  { re: /\/\/[^\n]*/, color: SYN.cmt },
  { re: /`(?:[^`\\]|\\.)*`/, color: SYN.str },
  { re: /"(?:[^"\\]|\\.)*"/, color: SYN.str },
  { re: /'(?:[^'\\]|\\.)*'/, color: SYN.str },
  { re: /\b(?:const|let|var|function|async|await|return|import|export|from|if|else|for|while|try|catch|throw|new|class|extends|typeof|instanceof|default|true|false|null|undefined|of|do)\b/, color: SYN.kw },
  { re: /\b\d+(?:\.\d+)?\b/, color: SYN.num },
]

type Lang = 'curl' | 'python' | 'js'

function CB({ code, lang }: { code: string; lang: Lang | 'json' }) {
  const pats = lang === 'json' ? JP : lang === 'curl' ? BP : lang === 'python' ? PP : JSP
  return (
    <pre style={{
      background: CODE_BG, color: CODE_FG,
      fontFamily: 'var(--font-geist-mono), ui-monospace, "SF Mono", Menlo, monospace',
      fontSize: 13.5, lineHeight: 1.65, padding: '14px 16px',
      borderRadius: 8, overflowX: 'auto', margin: 0, whiteSpace: 'pre',
    }}>
      <code>{buildNodes(code, pats)}</code>
    </pre>
  )
}

// ─── Code examples ───────────────────────────────────────────────────────────

const qsCurl = `curl -s "https://api.strata.dev/v1/best-practices?ecosystem=claude" \\
  -H "X-API-Key: sk_your_api_key_here"`

const qsJson = `{
  "ecosystem": "claude",
  "category": "best_practices",
  "items": [
    {
      "id": "bp_01jz4x9m2k",
      "title": "Use system prompts to define behavior",
      "body": "Define Claude's role in the system prompt rather than the first human turn for consistent behavior across conversations.",
      "updated_at": "2026-04-28T06:00:00Z"
    },
    {
      "id": "bp_02jz4x9m3n",
      "title": "Prefer structured outputs for downstream parsing",
      "body": "Request JSON or XML output when the response will be consumed programmatically. Claude reliably follows format instructions specified upfront.",
      "updated_at": "2026-04-28T06:00:00Z"
    }
  ]
}`

const authCurl = `curl -s "https://api.strata.dev/v1/best-practices?ecosystem=claude" \\
  -H "X-API-Key: sk_your_api_key_here"`

const authPy = `import httpx

client = httpx.Client(
    base_url="https://api.strata.dev/v1",
    headers={"X-API-Key": "sk_your_api_key_here"},
)

resp = client.get(
    "/best-practices",
    params={"ecosystem": "claude"},
)
data = resp.json()
print(data["items"])`

const authJs = `const resp = await fetch(
  "https://api.strata.dev/v1/best-practices?ecosystem=claude",
  {
    headers: {
      "X-API-Key": "sk_your_api_key_here",
    },
  }
);
const data = await resp.json();
console.log(data.items);`

const rl429 = `{
  "error": "Monthly call limit reached",
  "tier": "free",
  "limit": 100,
  "used": 100,
  "resets_at": "2026-05-01T00:00:00Z"
}`

const bpCurl = `curl -s "https://api.strata.dev/v1/best-practices?ecosystem=claude" \\
  -H "X-API-Key: sk_your_api_key_here"`

const bpJson = `{
  "ecosystem": "claude",
  "category": "best_practices",
  "items": [
    {
      "id": "bp_01jz4x9m2k",
      "title": "Use system prompts to define behavior",
      "body": "Define Claude's role in the system prompt for consistent behavior.",
      "updated_at": "2026-04-28T06:00:00Z"
    },
    {
      "id": "bp_02jz4x9m3n",
      "title": "Prefer structured outputs for parsing",
      "body": "Request JSON output when the response is consumed programmatically.",
      "updated_at": "2026-04-28T06:00:00Z"
    }
  ]
}`

const newsCurl = `curl -s "https://api.strata.dev/v1/news?ecosystem=claude&limit=3" \\
  -H "X-API-Key: sk_your_api_key_here"`

const newsJson = `{
  "ecosystem": "claude",
  "tier": "free",
  "items": [
    {
      "id": "ni_01jz4x8a1b",
      "title": "Claude 3.7 Sonnet adds extended thinking",
      "body": "Anthropic released Claude 3.7 Sonnet with a new extended thinking mode for complex reasoning tasks.",
      "source_url": "https://www.anthropic.com/news/claude-3-7-sonnet",
      "published_at": "2026-04-27T08:00:00Z"
    }
  ]
}`

const intCurl = `curl -s "https://api.strata.dev/v1/integrations?ecosystem=claude" \\
  -H "X-API-Key: sk_your_api_key_here"`

const intJson = `{
  "ecosystem": "claude",
  "items": [
    {
      "id": "int_01jz5a3k2p",
      "title": "LangChain — Claude integration",
      "body": "Use Claude as an LLM provider in LangChain chains and agents via langchain-anthropic."
    },
    {
      "id": "int_02jz5a3k3q",
      "title": "Vercel AI SDK",
      "body": "First-class Claude support for streaming and structured outputs in Next.js."
    }
  ]
}`

const srchCurl = `curl -s "https://api.strata.dev/v1/search?query=streaming+tool+use" \\
  -H "X-API-Key: sk_your_api_key_here"`

const srchJson = `{
  "query": "streaming tool use",
  "results": [
    {
      "id": "bp_01jz4x9m2k",
      "title": "Streaming tool use in Claude",
      "body": "Use the streaming API with tool_use to surface intermediate results while the model thinks.",
      "category": "best_practices",
      "ecosystem_slug": "claude",
      "source_url": null
    }
  ]
}`

const err401 = `{
  "error": "Invalid API key"
}`

const err429 = `{
  "error": "Monthly call limit reached",
  "tier": "free",
  "limit": 100,
  "resets_at": "2026-05-01T00:00:00Z"
}`

const ex1: Record<Lang, string> = {
  curl: `# Get Claude best practices
curl -s "https://api.strata.dev/v1/best-practices?ecosystem=claude" \\
  -H "X-API-Key: sk_your_api_key_here"`,
  python: `import httpx

client = httpx.Client(
    base_url="https://api.strata.dev/v1",
    headers={"X-API-Key": "sk_your_api_key_here"},
)

resp = client.get(
    "/best-practices",
    params={"ecosystem": "claude"},
)
for p in resp.json()["items"]:
    print(f"• {p['title']}")`,
  js: `const BASE = "https://api.strata.dev/v1";
const KEY  = "sk_your_api_key_here";

const resp = await fetch(
  \`\${BASE}/best-practices?ecosystem=claude\`,
  { headers: { "X-API-Key": KEY } }
);
const { items } = await resp.json();
items.forEach(p => console.log(\`• \${p.title}\`));`,
}

const ex2: Record<Lang, string> = {
  curl: `# Search across all ecosystems
curl -s "https://api.strata.dev/v1/search?query=function+calling" \\
  -H "X-API-Key: sk_your_api_key_here"`,
  python: `import httpx

client = httpx.Client(
    base_url="https://api.strata.dev/v1",
    headers={"X-API-Key": "sk_your_api_key_here"},
)

resp = client.get("/search", params={"query": "function calling"})
for r in resp.json()["results"]:
    print(f"[{r['ecosystem_slug']}] {r['title']}")`,
  js: `const resp = await fetch(
  "https://api.strata.dev/v1/search?query=function+calling",
  { headers: { "X-API-Key": "sk_your_api_key_here" } }
);
const { results } = await resp.json();
results.forEach(r =>
  console.log(\`[\${r.ecosystem_slug}] \${r.title}\`)
);`,
}

const ex3: Record<Lang, string> = {
  curl: `# Poll for latest news (page 1)
curl -s "https://api.strata.dev/v1/news?ecosystem=openai&limit=5" \\
  -H "X-API-Key: sk_your_api_key_here"

# Page 2 (offset-based)
curl -s "https://api.strata.dev/v1/news?ecosystem=openai&limit=5&offset=5" \\
  -H "X-API-Key: sk_your_api_key_here"`,
  python: `import httpx, time

client = httpx.Client(
    base_url="https://api.strata.dev/v1",
    headers={"X-API-Key": "sk_your_api_key_here"},
)

def poll_news(ecosystem: str, interval: int = 60):
    seen = set()
    while True:
        resp = client.get(
            "/news",
            params={"ecosystem": ecosystem, "limit": 20},
        )
        for item in resp.json()["items"]:
            if item["id"] not in seen:
                seen.add(item["id"])
                print(f"[NEW] {item['title']}")
        time.sleep(interval)

poll_news("openai")`,
  js: `const BASE = "https://api.strata.dev/v1";
const KEY  = "sk_your_api_key_here";

async function pollNews(ecosystem, intervalMs = 60_000) {
  const seen = new Set();
  while (true) {
    const resp = await fetch(
      \`\${BASE}/news?ecosystem=\${ecosystem}&limit=20\`,
      { headers: { "X-API-Key": KEY } }
    );
    const { items } = await resp.json();
    for (const item of items) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        console.log(\`[NEW] \${item.title}\`);
      }
    }
    await new Promise(r => setTimeout(r, intervalMs));
  }
}

pollNews("openai");`,
}

// ─── Nav config ──────────────────────────────────────────────────────────────

const NAV = [
  { id: 'quickstart', label: 'Quickstart' },
  { id: 'authentication', label: 'Authentication' },
  { id: 'rate-limits', label: 'Rate Limits' },
  {
    id: 'api-reference', label: 'API Reference',
    children: [
      { id: 'best-practices', label: '/best-practices' },
      { id: 'news', label: '/news' },
      { id: 'integrations', label: '/integrations' },
      { id: 'search', label: '/search' },
    ],
  },
  { id: 'errors', label: 'Errors' },
  { id: 'code-examples', label: 'Code Examples' },
  { id: 'mcp-server', label: 'MCP Server' },
]

const ALL_IDS = [
  'quickstart', 'authentication', 'rate-limits',
  'api-reference', 'best-practices', 'news', 'integrations', 'search',
  'errors', 'code-examples', 'mcp-server',
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function ParamRow({ name, type, req, desc }: { name: string; type: string; req: boolean; desc: string }) {
  return (
    <tr className="border-b border-[--border]">
      <td className="py-2.5 pr-4 align-top">
        <code className="font-mono text-[16px] text-[--foreground]">{name}</code>
      </td>
      <td className="py-2.5 pr-4 align-top">
        <code className="font-mono text-[17px]" style={{ color: SYN.num }}>{type}</code>
      </td>
      <td className="py-2.5 pr-4 align-top text-[16px]">
        {req
          ? <span style={{ color: SYN.kw }} className="font-mono text-[17px]">required</span>
          : <span className="text-[--muted-foreground] font-mono text-[17px]">optional</span>}
      </td>
      <td className="py-2.5 text-[17px] text-[--muted-foreground] align-top">{desc}</td>
    </tr>
  )
}

function RespRow({ name, type, desc }: { name: string; type: string; desc: string }) {
  return (
    <tr className="border-b border-[--border]">
      <td className="py-2.5 pr-4 align-top">
        <code className="font-mono text-[16px] text-[--foreground]">{name}</code>
      </td>
      <td className="py-2.5 pr-4 align-top">
        <code className="font-mono text-[17px]" style={{ color: SYN.num }}>{type}</code>
      </td>
      <td className="py-2.5 text-[17px] text-[--muted-foreground] align-top">{desc}</td>
    </tr>
  )
}

function TableHead({ cols }: { cols: string[] }) {
  return (
    <thead>
      <tr className="border-b border-[--border]">
        {cols.map(c => (
          <th key={c} className="pb-2 pr-4 text-left font-mono text-[9px] uppercase tracking-widest text-[--muted-foreground]">
            {c}
          </th>
        ))}
      </tr>
    </thead>
  )
}

function SectionH({ id, label, sub }: { id: string; label: string; sub?: string }) {
  return (
    <div id={id} className="mb-8 scroll-mt-8">
      <p className="font-mono text-[9px] uppercase tracking-widest text-[--muted-foreground] mb-2">
        Strata API
      </p>
      <h2 className="font-serif text-3xl font-normal text-[--foreground] leading-tight mb-2">{label}</h2>
      {sub && <p className="text-base text-[--muted-foreground]">{sub}</p>}
    </div>
  )
}

function EndpointH({ id, method, path }: { id: string; method: string; path: string }) {
  const [hov, setHov] = useState(false)

  function copyLink() {
    void navigator.clipboard.writeText(window.location.origin + '/docs#' + id)
  }

  return (
    <div
      id={id}
      className="flex items-center gap-2 mb-3 scroll-mt-8 group"
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      <span className="font-mono text-[17px] font-medium px-1.5 py-0.5 rounded"
        style={{ background: ACCENT + '22', color: ACCENT }}>
        {method}
      </span>
      <h3 className="font-mono text-[17px]" style={{ color: ACCENT }}>{path}</h3>
      {hov && (
        <button
          onClick={copyLink}
          className="text-[--muted-foreground] text-[16px] hover:text-[--foreground] transition-colors"
          title="Copy link"
        >
          #
        </button>
      )}
    </div>
  )
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4 mb-6">
      <div className="mt-0.5 flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-white text-[17px] font-semibold"
        style={{ background: ACCENT }}>
        {n}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[16px] font-semibold text-[--foreground] mb-1">{title}</p>
        <div className="text-[17px] text-[--muted-foreground] leading-relaxed">{children}</div>
      </div>
    </div>
  )
}

function Divider() {
  return <hr className="border-[--border] my-10" />
}

// ─── Panel content ───────────────────────────────────────────────────────────

interface PanelDef {
  tabs?: boolean
  render: (lang: Lang) => React.ReactNode
}

const PANELS: Record<string, PanelDef> = {
  quickstart: {
    render: () => (
      <div className="space-y-4">
        <div>
          <p className="font-mono text-[17px] uppercase tracking-widest mb-2" style={{ color: SYN.cmt }}>Request</p>
          <CB code={qsCurl} lang="curl" />
        </div>
        <div>
          <p className="font-mono text-[17px] uppercase tracking-widest mb-2" style={{ color: SYN.cmt }}>Response</p>
          <CB code={qsJson} lang="json" />
        </div>
      </div>
    ),
  },
  authentication: {
    tabs: true,
    render: (lang) => {
      const code = lang === 'python' ? authPy : lang === 'js' ? authJs : authCurl
      return <CB code={code} lang={lang} />
    },
  },
  'rate-limits': {
    render: () => (
      <div>
        <p className="font-mono text-[17px] uppercase tracking-widest mb-2" style={{ color: SYN.cmt }}>429 Response</p>
        <CB code={rl429} lang="json" />
      </div>
    ),
  },
  'api-reference': {
    render: () => (
      <div className="space-y-4">
        <CB code={bpCurl} lang="curl" />
        <CB code={bpJson} lang="json" />
      </div>
    ),
  },
  'best-practices': {
    render: () => (
      <div className="space-y-4">
        <CB code={bpCurl} lang="curl" />
        <CB code={bpJson} lang="json" />
      </div>
    ),
  },
  news: {
    render: () => (
      <div className="space-y-4">
        <CB code={newsCurl} lang="curl" />
        <CB code={newsJson} lang="json" />
        <p className="font-mono text-[17px] leading-relaxed" style={{ color: SYN.cmt }}>
          {'// Free tier: published_at will be > 24 hours ago'}
        </p>
      </div>
    ),
  },
  integrations: {
    render: () => (
      <div className="space-y-4">
        <CB code={intCurl} lang="curl" />
        <CB code={intJson} lang="json" />
      </div>
    ),
  },
  search: {
    render: () => (
      <div className="space-y-4">
        <CB code={srchCurl} lang="curl" />
        <CB code={srchJson} lang="json" />
      </div>
    ),
  },
  errors: {
    render: () => (
      <div className="space-y-4">
        <div>
          <p className="font-mono text-[17px] uppercase tracking-widest mb-2" style={{ color: SYN.cmt }}>401 Unauthorized</p>
          <CB code={err401} lang="json" />
        </div>
        <div>
          <p className="font-mono text-[17px] uppercase tracking-widest mb-2" style={{ color: SYN.cmt }}>429 Rate Limited</p>
          <CB code={err429} lang="json" />
        </div>
      </div>
    ),
  },
  'code-examples': {
    tabs: true,
    render: (lang) => (
      <div className="space-y-6">
        <div>
          <p className="font-mono text-[17px] uppercase tracking-widest mb-2" style={{ color: SYN.cmt }}>Example 1 — Best practices</p>
          <CB code={ex1[lang]} lang={lang} />
        </div>
        <div>
          <p className="font-mono text-[17px] uppercase tracking-widest mb-2" style={{ color: SYN.cmt }}>Example 2 — Search</p>
          <CB code={ex2[lang]} lang={lang} />
        </div>
        <div>
          <p className="font-mono text-[17px] uppercase tracking-widest mb-2" style={{ color: SYN.cmt }}>Example 3 — Poll news</p>
          <CB code={ex3[lang]} lang={lang} />
        </div>
      </div>
    ),
  },
  'mcp-server': {
    render: () => (
      <div className="space-y-5 overflow-y-auto flex-1 p-4">
        <div>
          <p className="font-mono text-[13px] uppercase tracking-widest mb-2" style={{ color: SYN.cmt }}>Remote (Streamable HTTP)</p>
          <CB code={`{
  "mcpServers": {
    "strata": {
      "url": "https://strata-fawn-xi.vercel.app/mcp",
      "headers": {
        "Authorization": "Bearer sk_your_api_key"
      }
    }
  }
}`} lang="json" />
        </div>
        <div>
          <p className="font-mono text-[13px] uppercase tracking-widest mb-2" style={{ color: SYN.cmt }}>Local (stdio)</p>
          <CB code={`{
  "mcpServers": {
    "strata": {
      "command": "npx",
      "args": [
        "tsx",
        "/path/to/strata/scripts/mcp-stdio.ts"
      ],
      "env": {
        "STRATA_API_KEY": "sk_your_api_key"
      }
    }
  }
}`} lang="json" />
        </div>
      </div>
    ),
  },
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function DocsPage() {
  const [active, setActive] = useState('quickstart')
  const [lang, setLang] = useState<Lang>('curl')

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        const hit = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
        if (hit) setActive(hit.target.id)
      },
      { rootMargin: '-8% 0px -62% 0px', threshold: 0 },
    )
    ALL_IDS.forEach(id => {
      const el = document.getElementById(id)
      if (el) obs.observe(el)
    })
    return () => obs.disconnect()
  }, [])

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  const panel = PANELS[active] ?? PANELS['quickstart']

  return (
    <div className="flex min-h-screen bg-[--background] text-[--foreground]">

      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <nav
        className="fixed top-0 left-0 h-screen overflow-y-auto z-20 border-r border-[--border] bg-[--background]"
        style={{ width: 220 }}
      >
        <div className="p-5 pb-4 border-b border-[--border]">
          <Link href="/" className="flex items-center gap-2 no-underline" style={{ textDecoration: 'none' }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg, #c084fc, #818cf8, #5fb085)',
              boxShadow: '0 0 8px rgba(192,132,252,0.6)',
              display: 'inline-block',
            }} />
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontWeight: 600,
              fontSize: 17,
              letterSpacing: '-0.01em',
              background: 'linear-gradient(135deg, #c084fc 0%, #818cf8 40%, #38bdf8 70%, #5fb085 100%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              Strata
            </span>
          </Link>
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 mt-3 text-[13px] font-mono transition-colors hover:opacity-80"
            style={{ color: 'var(--muted-foreground)' }}
          >
            ← dashboard
          </Link>
        </div>

        <div className="py-4 px-3">
          {NAV.map(item => {
            const isActive = active === item.id ||
              (item.children?.some(c => c.id === active) && active !== item.id && false)
            const parentActive = item.children?.some(c => c.id === active)

            return (
              <div key={item.id} className="mb-0.5">
                <button
                  onClick={() => scrollTo(item.id)}
                  className="w-full text-left px-3 py-1.5 rounded text-[17px] transition-colors flex items-center gap-2"
                  style={{
                    color: isActive || parentActive ? ACCENT : 'var(--muted-foreground)',
                    borderLeft: isActive ? `2px solid ${ACCENT}` : '2px solid transparent',
                    fontWeight: isActive || parentActive ? 500 : 400,
                    paddingLeft: isActive ? 10 : 12,
                  }}
                >
                  {item.label}
                </button>
                {item.children?.map(child => (
                  <button
                    key={child.id}
                    onClick={() => scrollTo(child.id)}
                    className="w-full text-left py-1 text-[16px] transition-colors font-mono"
                    style={{
                      color: active === child.id ? ACCENT : 'var(--muted-foreground)',
                      paddingLeft: 28,
                      paddingRight: 12,
                      borderLeft: active === child.id ? `2px solid ${ACCENT}` : '2px solid transparent',
                    }}
                  >
                    {child.label}
                  </button>
                ))}
              </div>
            )
          })}
        </div>
      </nav>

      {/* ── Content + Panel ──────────────────────────────────────────────── */}
      <div className="flex flex-1 min-w-0 justify-center" style={{ marginLeft: 220, marginRight: 340 }}>

        {/* Main content */}
        <main className="w-full py-16 px-10 lg:px-14" style={{ maxWidth: 680 }}>

          {/* ── Quickstart ── */}
          <SectionH id="quickstart" label="Quickstart" sub="Make your first API call in under 2 minutes." />

          <Step n={1} title="Get your API key">
            Sign up at{' '}
            <a href="https://strata.dev/signup" className="underline underline-offset-2 hover:opacity-80 transition-opacity" style={{ color: ACCENT }}>
              strata.dev/signup
            </a>
            {' '}then open the dashboard. Your key appears under{' '}
            <span className="font-mono text-[16px] bg-[--border] px-1 py-0.5 rounded">Overview → Your API Key</span>.
          </Step>

          <Step n={2} title="Make your first request">
            Pass your key in the{' '}
            <code className="font-mono text-[16px] bg-[--border] px-1 py-0.5 rounded">X-API-Key</code>
            {' '}header. All requests use HTTPS.
          </Step>

          <Step n={3} title="Explore the response">
            The response contains an{' '}
            <code className="font-mono text-[16px] bg-[--border] px-1 py-0.5 rounded">items</code>
            {' '}array. Each item has a{' '}
            <code className="font-mono text-[16px] bg-[--border] px-1 py-0.5 rounded">title</code>,{' '}
            <code className="font-mono text-[16px] bg-[--border] px-1 py-0.5 rounded">body</code>, and{' '}
            <code className="font-mono text-[16px] bg-[--border] px-1 py-0.5 rounded">updated_at</code>{' '}
            timestamp. Items are Claude-validated and safe for injection into AI prompts.
          </Step>

          <Divider />

          {/* ── Authentication ── */}
          <SectionH id="authentication" label="Authentication" />

          <p className="text-[16px] text-[--muted-foreground] mb-4 leading-relaxed">
            All API requests require an{' '}
            <code className="font-mono text-[16px] text-[--foreground] bg-[--border] px-1 py-0.5 rounded">X-API-Key</code>
            {' '}header. Keys are prefixed with <code className="font-mono text-[16px] text-[--foreground] bg-[--border] px-1 py-0.5 rounded">sk_</code>.
            Never expose your key in client-side code or version control.
          </p>

          <div className="rounded-lg border border-[--border] p-4 mb-6 text-[17px] text-[--muted-foreground] leading-relaxed">
            <strong className="text-[--foreground] font-medium">Finding your key:</strong>{' '}
            Dashboard → Overview → <em>Your API Key</em> section. If your key is compromised, use
            the <strong className="text-[--foreground] font-medium">Regenerate</strong> button — the old key is immediately revoked.
          </div>

          <Divider />

          {/* ── Rate Limits ── */}
          <SectionH id="rate-limits" label="Rate Limits" />

          <table className="w-full text-[17px] mb-6">
            <TableHead cols={['Plan', 'Calls / month', 'News lag', 'Refresh rate']} />
            <tbody>
              <tr className="border-b border-[--border]">
                <td className="py-2.5 pr-4 font-medium">Free</td>
                <td className="py-2.5 pr-4 text-[--muted-foreground]">100</td>
                <td className="py-2.5 pr-4 text-[--muted-foreground]">24 hours</td>
                <td className="py-2.5 text-[--muted-foreground]">Weekly</td>
              </tr>
              <tr>
                <td className="py-2.5 pr-4 font-medium" style={{ color: ACCENT }}>Pro</td>
                <td className="py-2.5 pr-4 text-[--muted-foreground]">10,000</td>
                <td className="py-2.5 pr-4 text-[--muted-foreground]">Real-time</td>
                <td className="py-2.5 text-[--muted-foreground]">Daily</td>
              </tr>
            </tbody>
          </table>

          <p className="text-[17px] text-[--muted-foreground] mb-3 leading-relaxed">
            When you exceed your monthly limit the API returns a{' '}
            <code className="font-mono text-[16px] text-[--foreground] bg-[--border] px-1 py-0.5 rounded">429</code> status.
            Limits reset on the first day of each calendar month.
          </p>
          <p className="text-[17px] text-[--muted-foreground] leading-relaxed">
            To increase your limit,{' '}
            <Link href="/dashboard/billing" className="underline underline-offset-2 hover:opacity-80 transition-opacity" style={{ color: ACCENT }}>
              upgrade to Pro
            </Link>.
          </p>

          <Divider />

          {/* ── API Reference ── */}
          <SectionH id="api-reference" label="API Reference" />
          <p className="text-[17px] text-[--muted-foreground] mb-2">
            Base URL: <code className="font-mono text-[16px] text-[--foreground] bg-[--border] px-1 py-0.5 rounded">https://api.strata.dev/v1</code>
          </p>
          <p className="text-[16px] text-[--muted-foreground] mb-8">
            In local dev: <code className="font-mono text-[17px] bg-[--border] px-1 py-0.5 rounded">http://localhost:3000/api/v1</code>
          </p>

          {/* /best-practices */}
          <EndpointH id="best-practices" method="GET" path="/best-practices" />
          <p className="text-[17px] text-[--muted-foreground] mb-5 leading-relaxed">
            Returns AI-verified best practices for a given ecosystem and category.
          </p>

          <p className="font-mono text-[9px] uppercase tracking-widest text-[--muted-foreground] mb-3">Parameters</p>
          <table className="w-full text-[17px] mb-6">
            <TableHead cols={['Parameter', 'Type', 'Required', 'Description']} />
            <tbody>
              <ParamRow name="ecosystem" type="string" req desc="Ecosystem slug: claude, openai, gemini, langchain, ollama" />
              <ParamRow name="category" type="string" req={false} desc="Content category. Defaults to best_practices" />
            </tbody>
          </table>

          <p className="font-mono text-[9px] uppercase tracking-widest text-[--muted-foreground] mb-3">Response fields</p>
          <table className="w-full text-[17px] mb-10">
            <TableHead cols={['Field', 'Type', 'Description']} />
            <tbody>
              <RespRow name="ecosystem" type="string" desc="Requested ecosystem slug" />
              <RespRow name="category" type="string" desc="Requested category" />
              <RespRow name="items" type="array" desc="Array of { id, title, body, updated_at }" />
            </tbody>
          </table>

          {/* /news */}
          <EndpointH id="news" method="GET" path="/news" />
          <p className="text-[17px] text-[--muted-foreground] mb-5 leading-relaxed">
            Returns aggregated news for an ecosystem. Free tier receives items older than 24 hours.
            Pro tier receives real-time results.
          </p>

          <p className="font-mono text-[9px] uppercase tracking-widest text-[--muted-foreground] mb-3">Parameters</p>
          <table className="w-full text-[17px] mb-6">
            <TableHead cols={['Parameter', 'Type', 'Required', 'Description']} />
            <tbody>
              <ParamRow name="ecosystem" type="string" req desc="Ecosystem slug" />
              <ParamRow name="limit" type="integer" req={false} desc="Number of results. Default 5, max 20" />
            </tbody>
          </table>

          <p className="font-mono text-[9px] uppercase tracking-widest text-[--muted-foreground] mb-3">Response fields</p>
          <table className="w-full text-[17px] mb-10">
            <TableHead cols={['Field', 'Type', 'Description']} />
            <tbody>
              <RespRow name="ecosystem" type="string" desc="Requested ecosystem slug" />
              <RespRow name="tier" type="string" desc="Your plan tier: free or pro" />
              <RespRow name="items" type="array" desc="Array of { id, title, body, source_url, published_at }" />
            </tbody>
          </table>

          {/* /integrations */}
          <EndpointH id="integrations" method="GET" path="/integrations" />
          <p className="text-[17px] text-[--muted-foreground] mb-5 leading-relaxed">
            Returns ranked integrations and MCP servers for an ecosystem.
          </p>

          <p className="font-mono text-[9px] uppercase tracking-widest text-[--muted-foreground] mb-3">Parameters</p>
          <table className="w-full text-[17px] mb-6">
            <TableHead cols={['Parameter', 'Type', 'Required', 'Description']} />
            <tbody>
              <ParamRow name="ecosystem" type="string" req desc="Ecosystem slug" />
              <ParamRow name="use_case" type="string" req={false} desc="Filter by use case, e.g. coding, research" />
            </tbody>
          </table>

          <p className="font-mono text-[9px] uppercase tracking-widest text-[--muted-foreground] mb-3">Response fields</p>
          <table className="w-full text-[17px] mb-10">
            <TableHead cols={['Field', 'Type', 'Description']} />
            <tbody>
              <RespRow name="ecosystem" type="string" desc="Requested ecosystem slug" />
              <RespRow name="items" type="array" desc="Array of { id, title, body } — rank field included when use_case is provided" />
            </tbody>
          </table>

          {/* /search */}
          <EndpointH id="search" method="GET" path="/search" />
          <p className="text-[17px] text-[--muted-foreground] mb-5 leading-relaxed">
            Full-text search across all verified content. Returns results ranked by relevance.
          </p>

          <p className="font-mono text-[9px] uppercase tracking-widest text-[--muted-foreground] mb-3">Parameters</p>
          <table className="w-full text-[17px] mb-6">
            <TableHead cols={['Parameter', 'Type', 'Required', 'Description']} />
            <tbody>
              <ParamRow name="query" type="string" req desc="Search query" />
              <ParamRow name="ecosystem" type="string" req={false} desc="Filter to a specific ecosystem. Default: all" />
            </tbody>
          </table>

          <p className="font-mono text-[9px] uppercase tracking-widest text-[--muted-foreground] mb-3">Response fields</p>
          <table className="w-full text-[17px] mb-10">
            <TableHead cols={['Field', 'Type', 'Description']} />
            <tbody>
              <RespRow name="query" type="string" desc="The original search query" />
              <RespRow name="results" type="array" desc="Array of { id, title, body, category, ecosystem_slug, source_url }" />
            </tbody>
          </table>

          <Divider />

          {/* ── Errors ── */}
          <SectionH id="errors" label="Error Codes" />

          <table className="w-full text-[17px] mb-6">
            <TableHead cols={['Status', 'Code', 'Description']} />
            <tbody>
              <tr className="border-b border-[--border]">
                <td className="py-2.5 pr-4 font-mono text-[16px]" style={{ color: SYN.kw }}>401</td>
                <td className="py-2.5 pr-4 text-[--foreground]">Invalid API key</td>
                <td className="py-2.5 text-[--muted-foreground]">Key missing or not found</td>
              </tr>
              <tr className="border-b border-[--border]">
                <td className="py-2.5 pr-4 font-mono text-[16px]" style={{ color: SYN.kw }}>403</td>
                <td className="py-2.5 pr-4 text-[--foreground]">Ecosystem not available on free tier</td>
                <td className="py-2.5 text-[--muted-foreground]">Upgrade to Pro for this ecosystem</td>
              </tr>
              <tr className="border-b border-[--border]">
                <td className="py-2.5 pr-4 font-mono text-[16px]" style={{ color: SYN.kw }}>404</td>
                <td className="py-2.5 pr-4 text-[--foreground]">Ecosystem not found</td>
                <td className="py-2.5 text-[--muted-foreground]">Check the ecosystem slug</td>
              </tr>
              <tr className="border-b border-[--border]">
                <td className="py-2.5 pr-4 font-mono text-[16px]" style={{ color: SYN.kw }}>429</td>
                <td className="py-2.5 pr-4 text-[--foreground]">Monthly limit reached</td>
                <td className="py-2.5 text-[--muted-foreground]">Upgrade or wait for monthly reset</td>
              </tr>
              <tr>
                <td className="py-2.5 pr-4 font-mono text-[16px]" style={{ color: SYN.kw }}>500</td>
                <td className="py-2.5 pr-4 text-[--foreground]">Internal server error</td>
                <td className="py-2.5 text-[--muted-foreground]">Something went wrong on our end</td>
              </tr>
            </tbody>
          </table>

          <p className="text-[17px] text-[--muted-foreground] mb-2">All error responses share the same shape:</p>
          <code className="font-mono text-[16px] block bg-[--border] px-3 py-2 rounded text-[--foreground]">
            {'{ "error": "message", "tier": "free" }'}
          </code>
          <p className="text-[17px] text-[--muted-foreground] mt-1">
            The <code className="font-mono text-[17px]">tier</code> field is included only on 403 and 429 responses.
          </p>

          <Divider />

          {/* ── Code Examples ── */}
          <SectionH id="code-examples" label="Code Examples" />

          <div className="space-y-10">
            <div>
              <h3 className="text-[16px] font-semibold text-[--foreground] mb-1">
                1. Get Claude best practices
              </h3>
              <p className="text-[17px] text-[--muted-foreground] mb-4">
                Fetch the current top best practices for the Claude ecosystem.
              </p>
              <CB code={ex1[lang]} lang={lang} />
            </div>

            <div>
              <h3 className="text-[16px] font-semibold text-[--foreground] mb-1">
                2. Search across all ecosystems
              </h3>
              <p className="text-[17px] text-[--muted-foreground] mb-4">
                Run a full-text search across every verified content item.
              </p>
              <CB code={ex2[lang]} lang={lang} />
            </div>

            <div>
              <h3 className="text-[16px] font-semibold text-[--foreground] mb-1">
                3. Poll for latest news with pagination
              </h3>
              <p className="text-[17px] text-[--muted-foreground] mb-4">
                Continuously poll the news endpoint, tracking seen items by ID to surface
                only new arrivals.
              </p>
              <CB code={ex3[lang]} lang={lang} />
            </div>
          </div>

          <Divider />

          {/* ── MCP Server ── */}
          <SectionH id="mcp-server" label="MCP Server" sub="Connect your agent once and get access to all Strata tools automatically." />

          <p className="text-[16px] text-[--muted-foreground] mb-6 leading-relaxed">
            Strata is available as a native MCP server. Any MCP-compatible client — Claude.ai,
            Cursor, Windsurf, or a custom agent — can call all four tools without making
            individual REST requests.
          </p>

          <h3 className="text-[17px] font-semibold text-[--foreground] mb-3">Remote connection (Streamable HTTP)</h3>
          <p className="text-[16px] text-[--muted-foreground] mb-4 leading-relaxed">
            Add to your MCP client config:
          </p>
          <CB code={`{
  "mcpServers": {
    "strata": {
      "url": "https://strata-fawn-xi.vercel.app/mcp",
      "headers": {
        "Authorization": "Bearer sk_your_api_key_here"
      }
    }
  }
}`} lang="json" />

          <h3 className="text-[17px] font-semibold text-[--foreground] mt-8 mb-3">Local connection (stdio)</h3>
          <p className="text-[16px] text-[--muted-foreground] mb-4 leading-relaxed">
            For local development with Claude Desktop, clone the repo and add to{' '}
            <code className="font-mono text-[14px] bg-[--border] px-1 py-0.5 rounded">claude_desktop_config.json</code>:
          </p>
          <CB code={`{
  "mcpServers": {
    "strata": {
      "command": "npx",
      "args": [
        "tsx",
        "/path/to/strata/scripts/mcp-stdio.ts"
      ],
      "env": {
        "STRATA_API_KEY": "sk_your_api_key_here"
      }
    }
  }
}`} lang="json" />

          <h3 className="text-[17px] font-semibold text-[--foreground] mt-8 mb-4">Available tools</h3>
          <div className="space-y-6">
            {([
              { name: 'get_best_practices', params: 'ecosystem (required), category (optional)', desc: 'Current AI-verified best practices for a given ecosystem.' },
              { name: 'get_latest_news', params: 'ecosystem (required), limit (optional, max 20)', desc: 'Latest news and releases. Pro gets real-time; free gets items older than 24 h.' },
              { name: 'get_top_integrations', params: 'ecosystem (required), use_case (optional)', desc: 'Ranked integrations and MCP servers. Filter by use case for relevance-sorted results.' },
              { name: 'search_ecosystem', params: 'query (required), ecosystem (optional)', desc: 'Full-text search across all verified content. Omit ecosystem to search globally.' },
            ] as const).map(({ name, params, desc }) => (
              <div key={name} className="border-l-2 pl-4" style={{ borderColor: ACCENT }}>
                <code className="font-mono text-[15px] text-[--foreground] font-semibold">{name}</code>
                <p className="font-mono text-[13px] mt-0.5 mb-1" style={{ color: SYN.cmt }}>{params}</p>
                <p className="text-[15px] text-[--muted-foreground]">{desc}</p>
              </div>
            ))}
          </div>

          <div className="pb-24" />
        </main>

        {/* ── Right panel ── */}
        <aside
          className="hidden lg:flex flex-col fixed top-0 right-0 h-screen overflow-hidden z-10"
          style={{ width: 340, background: CODE_BG }}
        >
          {/* Tab bar */}
          <div
            className="flex flex-shrink-0 items-end gap-0 px-4 pt-4"
            style={{ borderBottom: '1px solid #21262d', minHeight: 44 }}
          >
            {panel.tabs ? (
              (['curl', 'python', 'js'] as Lang[]).map(l => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className="px-3 pb-2.5 text-[16px] font-mono transition-colors cursor-pointer"
                  style={{
                    color: lang === l ? CODE_FG : SYN.cmt,
                    background: 'transparent',
                    borderTop: 'none',
                    borderLeft: 'none',
                    borderRight: 'none',
                    borderBottom: lang === l ? `2px solid ${ACCENT}` : '2px solid transparent',
                    paddingBottom: 10,
                  }}
                >
                  {l === 'curl' ? 'curl' : l === 'python' ? 'Python' : 'JavaScript'}
                </button>
              ))
            ) : (
              <div className="pb-2.5 px-1 text-[17px] font-mono" style={{ color: SYN.cmt }}>
                Example
              </div>
            )}
          </div>

          {/* Code content */}
          <div className="flex-1 overflow-y-auto p-4">
            {panel.render(lang)}
          </div>
        </aside>

      </div>
    </div>
  )
}
