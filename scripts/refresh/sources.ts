import Parser from 'rss-parser';
import type { EcosystemConfig, RawItem } from './types';

const rssParser = new Parser({ timeout: 10_000 });
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function truncate(text: string, max = 2000): string {
  if (!text) return '';
  return text.length > max ? text.slice(0, max - 1) + '…' : text;
}

async function fetchRss(
  url: string,
  ecosystem: string,
): Promise<RawItem[]> {
  const feed = await rssParser.parseURL(url);
  const cutoff = Date.now() - SEVEN_DAYS_MS;
  return feed.items
    .filter((item) => {
      // Items without a parseable date are skipped — defaulting to "now"
      // would leak ancient items past the freshness cutoff.
      if (!item.isoDate) return false;
      const ts = new Date(item.isoDate).getTime();
      if (Number.isNaN(ts)) return false;
      return ts >= cutoff;
    })
    .map((item) => ({
      ecosystem,
      category: 'news' as const,
      title: (item.title ?? '').trim(),
      body: truncate(item.contentSnippet ?? item.content ?? item.summary ?? ''),
      sourceUrl: item.link ?? item.guid ?? '',
      publishedAt: item.isoDate as string,
      sourceType: 'rss' as const,
    }))
    .filter((item) => item.title && item.sourceUrl);
}

interface RedditChild {
  data: {
    title: string;
    selftext: string;
    url: string;
    permalink: string;
    score: number;
    over_18: boolean;
    created_utc: number;
  };
}

async function fetchReddit(
  subreddit: string,
  ecosystem: string,
): Promise<RawItem[]> {
  const resp = await fetch(
    `https://www.reddit.com/r/${subreddit}/new.json?limit=10`,
    {
      headers: { 'User-Agent': 'Strata-Bot/1.0 (+https://strata.dev)' },
      signal: AbortSignal.timeout(10_000),
    },
  );
  if (!resp.ok) {
    throw new Error(`Reddit r/${subreddit}: HTTP ${resp.status}`);
  }
  const json = (await resp.json()) as { data: { children: RedditChild[] } };
  return json.data.children
    .filter((c) => c.data.score >= 10 && !c.data.over_18)
    .map((c) => {
      const d = c.data;
      return {
        ecosystem,
        category: 'news' as const,
        title: d.title.trim(),
        body: truncate(d.selftext || d.title),
        sourceUrl: `https://www.reddit.com${d.permalink}`,
        publishedAt: new Date(d.created_utc * 1000).toISOString(),
        sourceType: 'reddit' as const,
      };
    });
}

interface GitHubRelease {
  tag_name: string;
  body: string | null;
  html_url: string;
  published_at: string;
}

async function fetchGithubReleases(
  repo: string,
  ecosystem: string,
): Promise<RawItem[]> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  const resp = await fetch(
    `https://api.github.com/repos/${repo}/releases?per_page=5`,
    { headers, signal: AbortSignal.timeout(10_000) },
  );
  if (!resp.ok) {
    throw new Error(`GitHub ${repo}: HTTP ${resp.status}`);
  }
  const releases = (await resp.json()) as GitHubRelease[];
  return releases
    .filter((r) => r.published_at)
    .map((r) => ({
      ecosystem,
      category: 'news' as const,
      title: `${repo.split('/')[1]} ${r.tag_name}`,
      body: truncate(`${r.tag_name}\n\n${r.body ?? ''}`),
      sourceUrl: r.html_url,
      publishedAt: r.published_at,
      sourceType: 'github_release' as const,
    }));
}

async function fetchIntegrations(
  integrationsRepo: string,
  ecosystem: string,
): Promise<RawItem[]> {
  const resp = await fetch(
    `https://raw.githubusercontent.com/${integrationsRepo}/main/README.md`,
    { signal: AbortSignal.timeout(10_000) },
  );
  if (!resp.ok) {
    throw new Error(`Integrations README ${integrationsRepo}: HTTP ${resp.status}`);
  }
  const text = await resp.text();
  // Split on h2 headings, pick any section whose heading mentions the ecosystem slug
  const sections = text.split(/^## /m).slice(1);
  const relevant = sections.filter((s) =>
    s.toLowerCase().includes(ecosystem.toLowerCase()),
  );
  return relevant.slice(0, 5).map((section) => {
    const lines = section.trim().split('\n');
    const heading = lines[0].trim();
    const body = lines.slice(1).join('\n').trim();
    return {
      ecosystem,
      category: 'integrations' as const,
      title: heading,
      body: truncate(body),
      sourceUrl: `https://github.com/${integrationsRepo}`,
      publishedAt: new Date().toISOString(),
      sourceType: 'integrations_repo' as const,
    };
  });
}

export async function fetchAllSources(
  eco: EcosystemConfig,
): Promise<RawItem[]> {
  const tasks: Promise<RawItem[]>[] = [];

  for (const url of eco.rssFeeds) {
    tasks.push(
      fetchRss(url, eco.slug).catch((err) => {
        console.warn(`  [${eco.slug}] RSS ${url}: ${err.message}`);
        return [];
      }),
    );
  }

  for (const sub of eco.subreddits) {
    tasks.push(
      fetchReddit(sub, eco.slug).catch((err) => {
        console.warn(`  [${eco.slug}] Reddit r/${sub}: ${err.message}`);
        return [];
      }),
    );
  }

  for (const repo of eco.githubRepos) {
    tasks.push(
      fetchGithubReleases(repo, eco.slug).catch((err) => {
        console.warn(`  [${eco.slug}] GitHub ${repo}: ${err.message}`);
        return [];
      }),
    );
  }

  if (eco.integrationsRepo) {
    tasks.push(
      fetchIntegrations(eco.integrationsRepo, eco.slug).catch((err) => {
        console.warn(
          `  [${eco.slug}] Integrations ${eco.integrationsRepo}: ${err.message}`,
        );
        return [];
      }),
    );
  }

  const results = await Promise.allSettled(tasks);
  return results.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
}
