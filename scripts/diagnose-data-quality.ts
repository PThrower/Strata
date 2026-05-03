/**
 * One-shot diagnostic script for the 5 data-quality issues raised by an evaluator.
 * Read-only — does not mutate any rows.
 *
 * Usage:  npx tsx --env-file=.env.local scripts/diagnose-data-quality.ts
 */
import { createClient } from '@supabase/supabase-js'

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? ''
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
if (!SB_URL || !SB_KEY) throw new Error('Missing SUPABASE env vars')
const sb = createClient(SB_URL, SB_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
})

const C = {
  bold: '\x1b[1m', dim: '\x1b[2m', g: '\x1b[32m', y: '\x1b[33m',
  r: '\x1b[31m', c: '\x1b[36m', reset: '\x1b[0m',
}
function hdr(s: string) { console.log(`\n${C.bold}${C.c}━━ ${s} ━━${C.reset}`) }
function row(label: string, val: string) { console.log(`  ${label.padEnd(48)} ${val}`) }

async function countRows(table: string, filters: Record<string, unknown> = {}, isNullCols: string[] = [], notNullCols: string[] = []) {
  let q = sb.from(table).select('*', { count: 'exact', head: true })
  for (const [k, v] of Object.entries(filters)) q = q.eq(k, v as never)
  for (const c of isNullCols) q = q.is(c, null)
  for (const c of notNullCols) q = q.not(c, 'is', null)
  const { count, error } = await q
  if (error) throw new Error(`${table} count failed: ${error.message}`)
  return count ?? 0
}

async function fetchAllPaginated<T>(table: string, columns: string, filterFn?: (q: ReturnType<typeof sb.from>) => unknown): Promise<T[]> {
  const PAGE = 1000
  const out: T[] = []
  for (let off = 0; ; off += PAGE) {
    let q = sb.from(table).select(columns).range(off, off + PAGE - 1)
    if (filterFn) q = filterFn(q) as typeof q
    const { data, error } = await q
    if (error) throw new Error(`${table} fetch failed: ${error.message}`)
    if (!data || data.length === 0) break
    out.push(...(data as T[]))
    if (data.length < PAGE) break
  }
  return out
}

async function issue1() {
  hdr('Issue 1 — best_practices coverage')

  // Slugs in ECOSYSTEMS source-of-truth
  const slugs = ['claudecode', 'claude-code', 'claude', 'openai', 'cursor', 'codex']
  for (const slug of slugs) {
    const bp = await countRows('content_items', { ecosystem_slug: slug, category: 'best_practices' })
    const all = await countRows('content_items', { ecosystem_slug: slug })
    row(`${slug}.best_practices`, `${bp} rows  (total=${all})`)
  }

  // All distinct slugs that have any best_practices
  const all = await fetchAllPaginated<{ ecosystem_slug: string }>(
    'content_items', 'ecosystem_slug',
    (q) => q.eq('category', 'best_practices'),
  )
  const counts = new Map<string, number>()
  for (const r of all) counts.set(r.ecosystem_slug, (counts.get(r.ecosystem_slug) ?? 0) + 1)
  console.log(`\n  ${C.dim}distinct ecosystem slugs with any best_practices rows:${C.reset}`)
  for (const [s, n] of [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    row(`  ${s}`, `${n}`)
  }

  // ecosystems table
  const { data: ecosystems } = await sb.from('ecosystems').select('slug, available_on_free').order('slug')
  console.log(`\n  ${C.dim}ecosystems table slugs (first 10 of ${ecosystems?.length ?? 0}):${C.reset}`)
  for (const e of (ecosystems ?? []).slice(0, 10)) row(`  ${e.slug}`, e.available_on_free ? 'free' : 'pro')
}

async function issue2() {
  hdr('Issue 2 — runtime_score distribution')

  const total = await countRows('mcp_servers')
  const withScore = await countRows('mcp_servers', {}, [], ['runtime_score'])
  const noScore = total - withScore
  row('mcp_servers total', `${total}`)
  row('runtime_score IS NOT NULL', `${withScore}`)
  row('runtime_score IS NULL', `${noScore}`)

  // Histogram
  const rows = await fetchAllPaginated<{ runtime_score: number; runtime_status: string | null; tool_count: number | null; capability_flags: string[] | null }>(
    'mcp_servers', 'runtime_score, runtime_status, tool_count, capability_flags',
    (q) => q.not('runtime_score', 'is', null),
  )
  const hist = new Map<number, number>()
  for (const r of rows) hist.set(r.runtime_score, (hist.get(r.runtime_score) ?? 0) + 1)
  console.log(`\n  ${C.dim}runtime_score histogram (top 20):${C.reset}`)
  const sorted = [...hist.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20)
  for (const [score, n] of sorted) row(`  score=${score}`, `${n}  ${'█'.repeat(Math.min(60, Math.round(n / Math.max(1, sorted[0][1]) * 60)))}`)

  // Show how many cluster at 45 (the BASE=50 + tools(-5 unparsed) default)
  const at45 = hist.get(45) ?? 0
  const pct = ((at45 / Math.max(1, withScore)) * 100).toFixed(1)
  row(`\n  scored=45 (likely default)`, `${at45} / ${withScore} = ${pct}%`)

  // Status distribution (what are runtime_status values?)
  const statusCount = new Map<string, number>()
  for (const r of rows) statusCount.set(r.runtime_status ?? '<null>', (statusCount.get(r.runtime_status ?? '<null>') ?? 0) + 1)
  console.log(`\n  ${C.dim}runtime_status distribution among scored rows:${C.reset}`)
  for (const [s, n] of [...statusCount.entries()].sort((a, b) => b[1] - a[1])) row(`  ${s}`, `${n}`)

  // What % have tool_count NULL (the cause of -5 unparsed)
  const toolNull = rows.filter(r => r.tool_count === null).length
  const toolNullPct = ((toolNull / Math.max(1, rows.length)) * 100).toFixed(1)
  row(`\n  tool_count IS NULL (causes -5 unparsed)`, `${toolNull} / ${rows.length} = ${toolNullPct}%`)
}

async function issue3() {
  hdr('Issue 3 — news freshness')

  const { data: maxPub } = await sb
    .from('content_items')
    .select('published_at')
    .eq('category', 'news')
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(1)
  const { data: maxCreated } = await sb
    .from('content_items')
    .select('created_at')
    .eq('category', 'news')
    .order('created_at', { ascending: false, nullsFirst: false })
    .limit(1)
  const newsCount = await countRows('content_items', { category: 'news' })
  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const last7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const last30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const c24 = await sb.from('content_items').select('*', { count: 'exact', head: true })
    .eq('category', 'news').gte('created_at', last24h)
  const c7 = await sb.from('content_items').select('*', { count: 'exact', head: true })
    .eq('category', 'news').gte('created_at', last7d)
  const c30 = await sb.from('content_items').select('*', { count: 'exact', head: true })
    .eq('category', 'news').gte('created_at', last30d)

  row('news total', `${newsCount}`)
  row('MAX(published_at)', maxPub?.[0]?.published_at ?? '<none>')
  row('MAX(created_at)', maxCreated?.[0]?.created_at ?? '<none>')
  row('news created in last 24h', `${c24.count ?? 0}`)
  row('news created in last 7d', `${c7.count ?? 0}`)
  row('news created in last 30d', `${c30.count ?? 0}`)
}

async function issue4() {
  hdr('Issue 4 — integrations.source_url population')

  const total = await countRows('content_items', { category: 'integrations' })
  const withUrl = await countRows('content_items', { category: 'integrations' }, [], ['source_url'])
  const noUrl = total - withUrl
  row('integrations total', `${total}`)
  row('source_url IS NOT NULL', `${withUrl}`)
  row('source_url IS NULL', `${noUrl}`)
  row('% missing', `${((noUrl / Math.max(1, total)) * 100).toFixed(1)}%`)

  // Sample 5 with URL and 5 without
  const { data: sample } = await sb.from('content_items')
    .select('id, ecosystem_slug, title, source_url')
    .eq('category', 'integrations').limit(10)
  console.log(`\n  ${C.dim}sample 10 integrations:${C.reset}`)
  for (const r of (sample ?? [])) row(`  ${r.ecosystem_slug}`, `${r.title?.slice(0, 50) ?? '<no title>'}  url=${r.source_url ? 'yes' : 'NO'}`)
}

async function issue5() {
  hdr('Issue 5 — mcp_servers embedding coverage')

  const total = await countRows('mcp_servers')
  const withEmb = await countRows('mcp_servers', {}, [], ['embedding'])
  const noEmb = await countRows('mcp_servers', {}, ['embedding'])
  row('mcp_servers total', `${total}`)
  row('embedding IS NOT NULL', `${withEmb}`)
  row('embedding IS NULL', `${noEmb}`)
  row('coverage', `${((withEmb / Math.max(1, total)) * 100).toFixed(1)}%`)

  // Sample which ones are missing
  const { data: missing } = await sb.from('mcp_servers')
    .select('id, name, url, category')
    .is('embedding', null).limit(5)
  console.log(`\n  ${C.dim}sample 5 missing embeddings:${C.reset}`)
  for (const r of (missing ?? [])) row(`  ${r.name?.slice(0, 40) ?? '?'}`, `${r.url ?? ''}`)
}

async function main() {
  await issue1()
  await issue2()
  await issue3()
  await issue4()
  await issue5()
  console.log()
}

main().catch(e => { console.error(e); process.exit(1) })
