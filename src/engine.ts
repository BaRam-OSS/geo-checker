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

// 버전을 여기 손으로 적어 두면 반드시 어긋난다. 실제로 0.3.1·0.3.2 를 배포하고도
// 이 상수가 0.3.0 에 머물러, **저장된 리포트 전부가 0.3.0 으로 기록**됐다.
// 어떤 룰셋이 만든 점수인지 데이터로 알 수 없게 되는 문제라 package.json 에서 읽는다.
import { createRequire } from 'node:module';
const VERSION: string = (() => {
  try {
    const require = createRequire(import.meta.url);
    return require('../package.json').version as string;
  } catch {
    return '0.0.0-unknown';
  }
})();

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
    aeo: { score: 0, weight: weights.aeo, results: [] },
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
    if (rule.title_ko !== undefined) entry.title_ko = rule.title_ko;
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
