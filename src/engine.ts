import type {
  AuditContext,
  AuditReport,
  Category,
  CategoryReport,
  ReportMeta,
  ReportTiming,
  Rule,
  RuleResultEntry,
} from './types.js';
import { CATEGORY_WEIGHTS } from './types.js';

const VERSION = '0.3.0';

export interface RunRulesOptions {
  only?: string[];
  categories?: Category[];
  meta?: Partial<ReportMeta>;
  fetchMs?: number;
  startedAt?: number;
  categoryWeights?: Record<Category, number>;
}

export async function runRules(
  ctx: AuditContext,
  rules: Rule[],
  opts: RunRulesOptions = {},
): Promise<AuditReport> {
  const auditStart = performance.now();
  const onlySet = opts.only ? new Set(opts.only) : null;
  const catSet = opts.categories ? new Set<Category>(opts.categories) : null;
  const weights = opts.categoryWeights ?? CATEGORY_WEIGHTS;

  const buckets: Record<Category, CategoryReport> = {
    crawler: { score: 0, weight: weights.crawler, results: [] },
    'structured-data': { score: 0, weight: weights['structured-data'], results: [] },
    citation: { score: 0, weight: weights.citation, results: [] },
    content: { score: 0, weight: weights.content, results: [] },
  };

  for (const rule of rules) {
    if (onlySet && !onlySet.has(rule.id) && (!rule.stableId || !onlySet.has(rule.stableId))) continue;
    if (catSet && !catSet.has(rule.category)) continue;

    const ruleStart = performance.now();
    let result;
    try {
      result = await rule.run(ctx);
    } catch (err) {
      result = {
        status: 'skip' as const,
        score: 0,
        rationale: `Rule crashed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
    const durationMs = Math.round(performance.now() - ruleStart);

    const entry: RuleResultEntry = {
      id: rule.id,
      title: rule.title,
      weight: rule.weight,
      ...result,
      durationMs,
    };
    if (rule.stableId !== undefined) entry.stableId = rule.stableId;
    if (rule.group !== undefined) entry.group = rule.group;
    if (rule.impact !== undefined) entry.impact = rule.impact;
    if (rule.effort !== undefined) entry.effort = rule.effort;
    if (rule.docsUrl !== undefined) entry.docsUrl = rule.docsUrl;

    buckets[rule.category].results.push(entry);
  }

  for (const cat of Object.keys(buckets) as Category[]) {
    const b = buckets[cat];
    let weighted = 0;
    let totalWeight = 0;
    for (const r of b.results) {
      if (r.status === 'skip') continue;
      weighted += r.score * r.weight;
      totalWeight += r.weight;
    }
    b.score = totalWeight === 0 ? 0 : Math.round((weighted / totalWeight) * 100);
  }

  let overallWeighted = 0;
  let overallWeight = 0;
  for (const cat of Object.keys(buckets) as Category[]) {
    const b = buckets[cat];
    if (b.results.length === 0) continue;
    overallWeighted += b.score * b.weight;
    overallWeight += b.weight;
  }
  const overall = overallWeight === 0 ? 0 : Math.round(overallWeighted / overallWeight);

  const auditMs = Math.round(performance.now() - auditStart);
  const fetchMs = Math.max(0, Math.round(opts.fetchMs ?? 0));
  const totalMs =
    opts.startedAt !== undefined ? Math.round(performance.now() - opts.startedAt) : fetchMs + auditMs;

  const meta: ReportMeta = {
    toolVersion: VERSION,
    nodeVersion: process.versions.node,
  };
  if (opts.meta?.userAgent !== undefined) meta.userAgent = opts.meta.userAgent;
  if (opts.meta?.configPath !== undefined) meta.configPath = opts.meta.configPath;

  const timing: ReportTiming = { fetchMs, auditMs, totalMs };

  return {
    schemaVersion: 1,
    url: ctx.url,
    finalUrl: ctx.finalUrl,
    fetchedAt: ctx.fetchedAt,
    renderMode: ctx.renderMode,
    overall,
    categories: buckets,
    warnings: [...ctx.warnings],
    version: VERSION,
    meta,
    timing,
  };
}
