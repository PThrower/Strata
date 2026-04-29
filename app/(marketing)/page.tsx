import Link from 'next/link'

const ecosystems = [
  { name: 'Claude', vendor: 'anthropic', version: '3.7' },
  { name: 'OpenAI', vendor: 'openai', version: 'gpt-4o' },
  { name: 'Gemini', vendor: 'google', version: '2.0' },
  { name: 'LangChain', vendor: 'langchain', version: 'v0.3' },
  { name: 'Ollama', vendor: 'ollama', version: 'local' },
]

const tools = [
  {
    name: 'get_best_practices()',
    returns: '→ structured[]',
    description:
      'AI-verified best practices per ecosystem and category. Refreshed weekly, community-validated.',
    params: 'ecosystem: "claude"   category: "tool_use"',
  },
  {
    name: 'get_latest_news()',
    returns: '→ news[]',
    description:
      'Deduplicated news aggregated from RSS, Reddit, and GitHub releases. Real-time on Pro tier.',
    params: 'ecosystem: "openai"   limit: 10',
  },
  {
    name: 'get_top_integrations()',
    returns: '→ ranked[]',
    description:
      'Ranked integrations and MCP servers by ecosystem and use case. Updated weekly.',
    params: 'ecosystem: "claude"   use_case: "coding"',
  },
  {
    name: 'search_ecosystem()',
    returns: '→ results[]',
    description:
      'Semantic search across all verified content. Structured output — safe for agent pipelines.',
    params: 'query: "context limits"   ecosystem: "*"',
  },
]

const freeFeatures = [
  { label: 'calls / month', value: '100' },
  { label: 'ecosystems', value: '2' },
  { label: 'news lag', value: '24 hrs' },
  { label: 'refresh rate', value: 'weekly' },
]

const proFeatures = [
  { label: 'calls / month', value: '10,000' },
  { label: 'ecosystems', value: 'all' },
  { label: 'news lag', value: 'real-time' },
  { label: 'refresh rate', value: 'daily' },
]

export default function LandingPage() {
  return (
    <>
      {/* ── Hero ── */}
      <section className="py-16 px-6 border-b border-border">
        <p className="font-mono text-[9px] uppercase tracking-widest text-[#0F6E56] mb-6">
          ai ecostelligence — api
        </p>

        <h1 className="font-serif text-5xl font-normal leading-[1.15] mb-8">
          <span className="block">Verified knowledge,</span>
          <span className="block ml-[72px]">
            built for{' '}
            <span className="italic text-[#1D9E75]">agents.</span>
          </span>
        </h1>

        <hr className="border-t border-border my-6" />

        <div className="grid grid-cols-2 gap-12">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Structured, injection-safe AI ecosystem intelligence. Best
            practices, top integrations, and live news — grounded in verified
            sources and safe for agents to consume directly without prompt
            injection risk.
          </p>
          <div className="flex flex-col items-end gap-3">
            <Link
              href="/signup"
              className="bg-foreground text-background rounded-lg px-6 py-2.5 text-sm font-medium hover:opacity-80 transition-opacity"
            >
              start for free
            </Link>
            <span className="font-mono text-[10px] text-muted-foreground">
              curl api.strata.dev/v1 →
            </span>
          </div>
        </div>
      </section>

      {/* ── Ecosystem strip ── */}
      <div className="border-b border-border grid grid-cols-5">
        {ecosystems.map((eco, i) => (
          <div
            key={eco.name}
            className={`py-3 px-4${i < ecosystems.length - 1 ? ' border-r border-border' : ''}`}
          >
            <p className="text-sm font-medium">{eco.name}</p>
            <p className="font-mono text-[9px] text-muted-foreground">
              {eco.vendor} · {eco.version}
            </p>
            <div className="flex items-center gap-1 mt-1">
              <div className="w-[5px] h-[5px] rounded-full bg-[#1D9E75]" />
              <span className="font-mono text-[9px] text-[#1D9E75]">live</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── API methods ── */}
      <section className="py-10 px-6 border-b border-border">
        <div className="flex justify-between mb-6">
          <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
            api methods
          </span>
          <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
            04 tools
          </span>
        </div>

        <div>
          {tools.map((tool, i) => (
            <div
              key={tool.name}
              className={`border-l-2 border-[#1D9E75] pl-4${i < tools.length - 1 ? ' mb-4' : ''}`}
            >
              <div className="flex justify-between items-baseline">
                <span className="font-mono font-medium text-sm">
                  {tool.name}
                </span>
                <span className="font-mono text-[9px] text-[#1D9E75]">
                  {tool.returns}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {tool.description}
              </p>
              <p className="font-mono text-[10px] text-muted-foreground mt-1">
                {tool.params}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="py-10 px-6 border-b border-border">
        <div className="flex justify-between">
          <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
            pricing
          </span>
          <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
            7-day trial · no card required
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-6">
          {/* Free */}
          <div className="border border-border rounded-xl p-6">
            <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
              free
            </p>
            <p className="font-serif text-4xl font-normal mt-1">$0</p>
            <hr className="border-border my-4" />
            <div>
              {freeFeatures.map((f) => (
                <div
                  key={f.label}
                  className="flex justify-between text-sm border-b border-border last:border-0 py-1.5"
                >
                  <span className="text-muted-foreground">{f.label}</span>
                  <span className="font-mono text-xs">{f.value}</span>
                </div>
              ))}
            </div>
            <Link
              href="/signup"
              className="mt-4 block w-full border border-border rounded-lg py-2.5 text-sm text-center hover:bg-foreground hover:text-background transition-colors"
            >
              start free
            </Link>
          </div>

          {/* Pro */}
          <div className="border-2 border-[#1D9E75] rounded-xl p-6">
            <p className="font-mono text-[9px] uppercase tracking-widest text-[#1D9E75]">
              pro
            </p>
            <p className="font-serif text-4xl font-normal mt-1">
              $29{' '}
              <span className="text-sm text-muted-foreground font-sans">
                /mo
              </span>
            </p>
            <hr className="border-border my-4" />
            <div>
              {proFeatures.map((f) => (
                <div
                  key={f.label}
                  className="flex justify-between text-sm border-b border-border last:border-0 py-1.5"
                >
                  <span className="text-muted-foreground">{f.label}</span>
                  <span className="font-mono text-xs text-[#1D9E75]">
                    {f.value}
                  </span>
                </div>
              ))}
            </div>
            <Link
              href="/signup"
              className="mt-4 block w-full bg-[#1D9E75] hover:bg-[#0F6E56] text-white rounded-lg py-2.5 text-sm text-center transition-colors"
            >
              get pro access
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
