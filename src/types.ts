import type { CheerioAPI } from 'cheerio';

export type Status = 'pass' | 'warn' | 'fail' | 'skip';

export type Category = 'crawler' | 'structured-data' | 'citation' | 'content';

export interface RobotsRuleGroup {
  userAgent: string;
  allow: string[];
  disallow: string[];
}

export interface RobotsTxt {
  raw: string;
  groups: RobotsRuleGroup[];
  sitemaps: string[];
}

export interface LlmsTxtLink {
  title: string;
  url: string;
  description?: string;
}

export interface LlmsTxtSection {
  title: string;
  links: LlmsTxtLink[];
}

export interface LlmsTxt {
  raw: string;
  title: string | null;
  summary: string | null;
  sections: LlmsTxtSection[];
}

export interface SitemapSummary {
  urls: string[];
  lastmod?: string;
}

export interface AuditContext {
  url: string;
  finalUrl: string;
  html: string;
  $: CheerioAPI;
  headers: Record<string, string>;
  status: number;
  robots: RobotsTxt | null;
  llmsTxt: LlmsTxt | null;
  sitemap: SitemapSummary | null;
  jsonLd: unknown[];
  renderMode: 'static' | 'rendered';
  fetchedAt: string;
  warnings: string[];
}

export interface RuleResult {
  status: Status;
  score: number;
  rationale: string;
  evidence?: unknown;
  fixUrl?: string;
}

export interface Rule {
  id: string;
  category: Category;
  weight: number;
  title: string;
  description: string;
  run(ctx: AuditContext): Promise<RuleResult> | RuleResult;
}

export interface CategoryReport {
  score: number;
  weight: number;
  results: Array<RuleResult & { id: string; title: string; weight: number }>;
}

export interface AuditReport {
  url: string;
  finalUrl: string;
  fetchedAt: string;
  renderMode: 'static' | 'rendered';
  overall: number;
  categories: Record<Category, CategoryReport>;
  warnings: string[];
  version: string;
}

export interface AuditOptions {
  render?: boolean;
  timeoutMs?: number;
  userAgent?: string;
  extraRules?: Rule[];
  only?: string[];
  categories?: Category[];
}

export function defineRule(rule: Rule): Rule {
  return rule;
}

export const CATEGORY_WEIGHTS: Record<Category, number> = {
  crawler: 25,
  'structured-data': 30,
  citation: 25,
  content: 20,
};
