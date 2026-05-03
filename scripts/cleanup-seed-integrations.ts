/**
 * One-shot: delete the 15 seed integrations rows with NULL source_url.
 * These were inserted by supabase/seed.sql at platform bootstrap and were
 * never replaced by the refresh pipeline (no replace_integrations RPC).
 * Real integrations from awesome-mcp-servers now flow into the same table
 * via the regular pipeline; the seed rows are redundant + un-attributable.
 *
 * Run:  npx tsx --env-file=.env.local scripts/cleanup-seed-integrations.ts
 */
import { getServiceClient } from './refresh/writer'

async function main() {
  const sb = getServiceClient()

  const { data: before } = await sb.from('content_items')
    .select('id, ecosystem_slug, title, created_at')
    .eq('category', 'integrations')
    .is('source_url', null)
  console.log(`Before: ${before?.length ?? 0} integrations rows with NULL source_url`)

  if (!before || before.length === 0) {
    console.log('Nothing to clean up.')
    return
  }
  for (const r of before as { ecosystem_slug: string; title: string }[]) {
    console.log(`  - [${r.ecosystem_slug}] ${r.title.slice(0, 70)}`)
  }

  const { error, count } = await sb.from('content_items')
    .delete({ count: 'exact' })
    .eq('category', 'integrations')
    .is('source_url', null)

  if (error) throw new Error(`delete failed: ${error.message}`)
  console.log(`\n✓ Deleted ${count ?? 0} rows.`)

  const { count: after } = await sb.from('content_items')
    .select('*', { count: 'exact', head: true })
    .eq('category', 'integrations')
    .is('source_url', null)
  console.log(`After: ${after ?? 0} integrations rows with NULL source_url`)
}

main().catch(e => { console.error(e); process.exit(1) })
