// Debug script: run with `npx tsx scripts/debug-validation.ts [ecosystem-slug]`
// Examples:
//   npx tsx scripts/debug-validation.ts openai
//   npx tsx scripts/debug-validation.ts groq
// Shows exactly what Claude returns for one validation batch so you can
// see whether items are being rejected by keep:false, confidence:low, or a parse error.

import Anthropic from '@anthropic-ai/sdk';
import { fetchAllSources } from './refresh/sources';
import { ECOSYSTEMS } from './refresh/ecosystems';
import { getServiceClient, urlDedup } from './refresh/writer';

const DIM    = '\x1b[2m'
const BOLD   = '\x1b[1m'
const RED    = '\x1b[38;2;239;68;68m'
const GREEN  = '\x1b[38;2;0;196;114m'
const YELLOW = '\x1b[38;2;245;158;11m'
const RESET  = '\x1b[0m'

const VALIDATION_SYSTEM = `You are a content quality validator for Strata, an AI ecosystem intelligence platform.
Your job is to review content items and determine if they are:
1. Genuinely relevant to the specified AI ecosystem
2. Accurate and not misleading
3. Useful to developers building AI applications
4. Not a duplicate or near-duplicate of another item in this batch

Important: Age of content is NOT a rejection criterion. Accept any developer-useful content
regardless of publish date. Only reject items that are irrelevant, inaccurate, non-technical,
or truly low-quality (e.g. pure marketing fluff, memes, personal announcements).

For each item, return a JSON array with objects containing:
- keep: boolean
- reason: brief explanation
- improvedTitle: cleaned up title if needed (or null)
- improvedBody: improved summary if needed, max 300 chars (or null)
- category: best_practices | news | integrations (re-categorize if needed)
- confidence: high | medium | low

Return ONLY a JSON array, no prose.`;

async function debugEcosystem(slug: string) {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  const supabase = getServiceClient();

  const eco = ECOSYSTEMS.find(e => e.slug === slug);
  if (!eco) {
    console.error(`${RED}Unknown ecosystem: ${slug}${RESET}`);
    console.log(`Available: ${ECOSYSTEMS.map(e => e.slug).join(', ')}`);
    process.exit(1);
  }

  console.log(`\n${BOLD}═══ Debug validation for: ${eco.slug} ═══${RESET}\n`);
  console.log(`${DIM}RSS feeds: ${eco.rssFeeds.length > 0 ? eco.rssFeeds.join(', ') : '(none)'}${RESET}`);
  console.log(`${DIM}Subreddits: r/${eco.subreddits.join(', r/')}${RESET}`);
  console.log(`${DIM}GitHub repos: ${eco.githubRepos.join(', ')}${RESET}\n`);

  // 1. Fetch raw items
  console.log(`${DIM}Fetching sources...${RESET}`);
  const raw = await fetchAllSources(eco);
  console.log(`Fetched: ${raw.length} raw items`);

  // 2. URL dedup
  const fresh = await urlDedup(supabase, eco.slug, raw);
  console.log(`After URL dedup: ${fresh.length} items\n`);

  if (fresh.length === 0) {
    console.log(`${YELLOW}⚠ No new items after URL dedup — DB already has all these URLs.${RESET}`);
    console.log(`${DIM}Testing with first 10 raw items instead (ignoring dedup).${RESET}\n`);
  }

  const sample = (fresh.length > 0 ? fresh : raw).slice(0, 10);
  console.log(`${BOLD}Sending ${sample.length} items to Claude for validation...${RESET}\n`);

  // 3. Print the items we're sending
  sample.forEach((item, i) => {
    console.log(`${DIM}[${i}]${RESET} ${item.title}`);
    console.log(`    ${DIM}category:${RESET} ${item.category}  ${DIM}sourceType:${RESET} ${item.sourceType}`);
    console.log(`    ${DIM}url:${RESET} ${item.sourceUrl ?? '(none)'}`);
    console.log(`    ${DIM}body:${RESET} ${item.body.slice(0, 120)}...`);
    console.log();
  });

  const payload = sample.map((item, i) => ({
    index: i,
    title: item.title,
    body: item.body.slice(0, 600),
    category: item.category,
    sourceType: item.sourceType,
  }));

  // 4. Call Claude and print raw response
  let rawText: string;
  try {
    const resp = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: VALIDATION_SYSTEM,
      messages: [{ role: 'user', content: `Ecosystem: ${eco.slug}\n\nItems:\n${JSON.stringify(payload, null, 2)}` }],
    });
    const block = resp.content[0];
    if (block.type !== 'text') throw new Error('Unexpected content block type');
    rawText = block.text;
  } catch (err) {
    console.error(`${RED}API call failed: ${err}${RESET}`);
    process.exit(1);
  }

  console.log(`${BOLD}Raw Claude response:${RESET}`);
  console.log(rawText);
  console.log();

  // 5. Attempt parse — mirror the exact logic from validate.ts
  let results: Array<{ keep: boolean; reason: string; confidence: string; improvedTitle?: string | null; improvedBody?: string | null; category?: string }>;
  try {
    const cleaned = rawText.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '');
    results = JSON.parse(cleaned);
  } catch (err) {
    console.error(`${RED}JSON.parse failed: ${err}${RESET}`);
    console.log(`${DIM}cleaned text:${RESET}`, rawText.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, ''));
    process.exit(1);
  }

  // 6. Show per-item decision with full details
  console.log(`${BOLD}Per-item decisions:${RESET}`);
  let kept = 0, dropped = 0;
  for (let i = 0; i < sample.length; i++) {
    const r = results[i];
    if (!r) {
      console.log(`  [${i}] ${RED}MISSING${RESET} — results array shorter than input`);
      dropped++;
      continue;
    }
    const verdict = r.keep && r.confidence !== 'low'
      ? `${GREEN}KEEP${RESET}`
      : `${RED}DROP${RESET}`;
    const why = !r.keep ? `keep:false` : `confidence:${r.confidence}`;
    console.log(`  [${i}] ${verdict}  ${DIM}(${why}) cat:${r.category}${RESET}`);
    console.log(`       title: ${sample[i].title}`);
    console.log(`       reason: ${r.reason}`);
    if (r.improvedTitle) console.log(`       ${DIM}improved title: ${r.improvedTitle}${RESET}`);
    console.log();
    if (r.keep && r.confidence !== 'low') kept++; else dropped++;
  }

  console.log(`${BOLD}Result:${RESET} ${GREEN}${kept} kept${RESET}, ${RED}${dropped} dropped${RESET} out of ${sample.length}`);

  // 7. Check for structural anomalies
  console.log(`\n${BOLD}Structural checks:${RESET}`);
  console.log(`  results is array:`, Array.isArray(results));
  console.log(`  results.length:`, results.length, '(expected', sample.length, ')');
  const hasAllKeys = results.every(r => r && 'keep' in r && 'confidence' in r && 'reason' in r);
  console.log(`  all results have required keys:`, hasAllKeys);
}

async function main() {
  const slug = process.argv[2] ?? 'openai';
  await debugEcosystem(slug);
}

main().catch((err) => {
  console.error(`Fatal: ${err}`);
  process.exit(1);
});
