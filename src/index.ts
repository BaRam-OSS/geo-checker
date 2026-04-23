import type { AuditOptions, AuditReport } from './types.js';
import { buildContext } from './context.js';
import { runRules } from './engine.js';
import { defaultRules } from './rules/index.js';
import { applyConfig, loadConfig } from './config.js';

export { defineRule, CATEGORY_WEIGHTS } from './types.js';
export { defaultRules } from './rules/index.js';
export { runBatch, summaryToJson, urlToSlug } from './batch.js';
export type { BatchOptions, BatchResult, BatchSuccess, BatchFailure, BatchSummary, BatchProgressEvent } from './batch.js';
export { toCsv } from './reporters/csv.js';
export { toMarkdown } from './reporters/markdown.js';
export { toSarif } from './reporters/sarif.js';
export { diffReports, formatDiffLine } from './reporters/diff.js';
export type { ReportDiff, RuleDelta, CategoryDelta } from './reporters/diff.js';
export { loadConfig, findConfig, applyConfig } from './config.js';
export type {
  Status,
  Category,
  Rule,
  RuleResult,
  AuditContext,
  AuditOptions,
  AuditReport,
  CategoryReport,
  RobotsTxt,
  RobotsRuleGroup,
  LlmsTxt,
  LlmsTxtLink,
  LlmsTxtSection,
  SitemapSummary,
  GeoConfig,
  RuleOverride,
} from './types.js';

export async function audit(url: string, options: AuditOptions = {}): Promise<AuditReport> {
  const startedAt = performance.now();

  let config = options.config;
  let configPath = options.configPath ?? null;
  if (!config && configPath) {
    const loaded = await loadConfig(configPath);
    config = loaded.config;
    configPath = loaded.path;
  }

  const ctx = await buildContext(url, {
    ...(options.render ? { render: true } : {}),
    ...(options.userAgent !== undefined ? { userAgent: options.userAgent } : {}),
    ...(options.timeoutMs !== undefined ? { timeoutMs: options.timeoutMs } : {}),
  });
  const fetchMs = Math.round(performance.now() - startedAt);

  const baseRules = [...defaultRules, ...(options.extraRules ?? [])];
  const { rules, categoryWeights } = applyConfig(baseRules, config);

  const meta: { userAgent?: string; configPath?: string } = {};
  if (options.userAgent !== undefined) meta.userAgent = options.userAgent;
  if (configPath) meta.configPath = configPath;

  return runRules(ctx, rules, {
    ...(options.only ? { only: options.only } : {}),
    ...(options.categories ? { categories: options.categories } : {}),
    ...(Object.keys(meta).length > 0 ? { meta } : {}),
    categoryWeights,
    fetchMs,
    startedAt,
  });
}
