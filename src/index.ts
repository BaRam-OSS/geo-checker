import type { AuditOptions, AuditReport } from './types.js';
import { buildContext } from './context.js';
import { runRules } from './engine.js';
import { defaultRules } from './rules/index.js';

export { defineRule, CATEGORY_WEIGHTS } from './types.js';
export { defaultRules } from './rules/index.js';
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
} from './types.js';

export async function audit(url: string, options: AuditOptions = {}): Promise<AuditReport> {
  const startedAt = performance.now();
  const ctx = await buildContext(url, {
    ...(options.render ? { render: true } : {}),
    ...(options.userAgent !== undefined ? { userAgent: options.userAgent } : {}),
    ...(options.timeoutMs !== undefined ? { timeoutMs: options.timeoutMs } : {}),
  });
  const fetchMs = Math.round(performance.now() - startedAt);
  const rules = [...defaultRules, ...(options.extraRules ?? [])];
  return runRules(ctx, rules, {
    ...(options.only ? { only: options.only } : {}),
    ...(options.categories ? { categories: options.categories } : {}),
    ...(options.userAgent !== undefined ? { meta: { userAgent: options.userAgent } } : {}),
    fetchMs,
    startedAt,
  });
}
