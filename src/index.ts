import type { AuditOptions, AuditReport } from './types.js';

export { defineRule, CATEGORY_WEIGHTS } from './types.js';
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

export async function audit(_url: string, _options: AuditOptions = {}): Promise<AuditReport> {
  throw new Error('audit() is not implemented yet. See Phase 1 of the implementation plan.');
}
