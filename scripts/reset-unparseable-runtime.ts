/**
 * Reset runtime_updated_at = NULL for the 421 mcp_servers stuck at score=45
 * (BASE 50 minus the -5 "tool_count unparseable" penalty, no caps, no probe).
 * They'll be re-analyzed by the daily refresh — runtime-static.ts now has an
 * additional pattern (JS/TS `{ name, description }` object literals) that the
 * canonical setRequestHandler(ListToolsRequestSchema) shape will match.
 *
 * Run:  npx tsx --env-file=.env.local scripts/reset-unparseable-runtime.ts
 */
import { getServiceClient } from './refresh/writer'

async function main() {
  const sb = getServiceClient()

  const { count: before } = await sb.from('mcp_servers')
    .select('*', { count: 'exact', head: true })
    .eq('runtime_score', 45)
    .is('hosted_endpoint', null)
    .is('tool_count', null)
  console.log(`Before: ${before ?? 0} rows match runtime_score=45 + tool_count=null + no hosted_endpoint`)

  if ((before ?? 0) === 0) return

  const { error, count } = await sb.from('mcp_servers')
    .update({
      runtime_updated_at: null,
      runtime_status: null,
      runtime_score: null,
      runtime_components: null,
    }, { count: 'exact' })
    .eq('runtime_score', 45)
    .is('hosted_endpoint', null)
    .is('tool_count', null)

  if (error) throw new Error(`reset failed: ${error.message}`)
  console.log(`✓ Reset ${count ?? 0} rows. Daily refresh will re-score them with the improved tool parser.`)

  const { count: stillUnscored } = await sb.from('mcp_servers')
    .select('*', { count: 'exact', head: true })
    .is('runtime_updated_at', null)
  console.log(`Total mcp_servers now awaiting runtime score: ${stillUnscored ?? 0}`)
  console.log(`(refresh batches 30/run; ~14 days at 2x/day to clear the queue. Or run scripts/score-mcp-runtime.ts manually.)`)
}

main().catch(e => { console.error(e); process.exit(1) })
