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

export type Impact = 'critical' | 'high' | 'medium' | 'low';
export type Effort = 'low' | 'medium' | 'high';
export type RuleGroup = 'opportunity' | 'diagnostic' | 'info';

export interface EvidenceLocation {
  selector?: string;
  snippet?: string;
  line?: number;
  col?: number;
}

export interface RuleResult {
  status: Status;
  score: number;
  rationale: string;
  evidence?: unknown;
  locations?: EvidenceLocation[];
  fixUrl?: string;
  fixHint?: string;
  estimatedImpact?: number;
}

export interface Rule {
  id: string;
  stableId?: string;
  category: Category;
  group?: RuleGroup;
  weight: number;
  impact?: Impact;
  effort?: Effort;
  title: string;
  description: string;
  docsUrl?: string;
  run(ctx: AuditContext): Promise<RuleResult> | RuleResult;
}

export interface RuleResultEntry extends RuleResult {
  id: string;
  stableId?: string;
  title: string;
  weight: number;
  group?: RuleGroup;
  impact?: Impact;
  effort?: Effort;
  docsUrl?: string;
  durationMs?: number;
}

export interface CategoryReport {
  score: number;
  weight: number;
  results: RuleResultEntry[];
}

export interface ReportMeta {
  toolVersion: string;
  nodeVersion: string;
  userAgent?: string;
  configPath?: string;
}

export interface ReportTiming {
  fetchMs: number;
  auditMs: number;
  totalMs: number;
}

export interface AuditReport {
  schemaVersion: 1;
  url: string;
  finalUrl: string;
  fetchedAt: string;
  renderMode: 'static' | 'rendered';
  overall: number;
  categories: Record<Category, CategoryReport>;
  warnings: string[];
  version: string;
  meta: ReportMeta;
  timing: ReportTiming;
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
