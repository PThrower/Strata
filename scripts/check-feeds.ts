import { ECOSYSTEMS } from './refresh/ecosystems';

const RED = '\x1b[31m', GREEN = '\x1b[32m', RESET = '\x1b[0m';

async function main() {
  const all = ECOSYSTEMS.flatMap((e) => e.rssFeeds.map((url) => ({ eco: e.slug, url })));
  console.log(`Checking ${all.length} RSS feeds...\n`);

  const results = await Promise.allSettled(
    all.map(async ({ eco, url }) => {
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      return { eco, url, status: res.status, ok: res.ok };
    }),
  );

  let bad = 0;
  for (const r of results) {
    if (r.status === 'rejected') {
      const msg = r.reason instanceof Error ? r.reason.message : String(r.reason);
      console.log(`${RED}ERR ${RESET} ${msg}`);
      bad++;
    } else if (!r.value.ok) {
      console.log(`${RED}${r.value.status}${RESET}  ${r.value.eco.padEnd(20)} ${r.value.url}`);
      bad++;
    } else {
      console.log(`${GREEN}${r.value.status}${RESET}  ${r.value.eco.padEnd(20)} ${r.value.url}`);
    }
  }

  console.log(`\n${bad} broken out of ${all.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
