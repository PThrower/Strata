export type Category = 'best_practices' | 'news' | 'integrations';
export type SourceType = 'rss' | 'reddit' | 'github_release' | 'integrations_repo';

export interface RawItem {
  ecosystem: string;
  category: Category;
  title: string;
  body: string;
  sourceUrl: string;
  publishedAt: string; // ISO 8601
  sourceType: SourceType;
}

export interface ValidatedItem extends RawItem {
  confidence: 'high' | 'medium';
}

export interface EcosystemConfig {
  slug: string;
  rssFeeds: string[];
  subreddits: string[];
  githubRepos: string[];
  integrationsRepo?: string;
  bestPracticesPrompt: string;
}

export interface EcosystemSummary {
  slug: string;
  fetched: number;
  newAfterUrlDedup: number;
  validated: number;
  written: number;
  bestPracticesRegen: boolean;
  errors: string[];
}
