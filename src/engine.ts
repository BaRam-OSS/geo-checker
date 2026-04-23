import type { AuditContext, AuditReport, Category, CategoryReport, Rule } from './types.js';
import { CATEGORY_WEIGHTS } from './types.js';

const VERSION = '0.1.0';

export interface RunRulesOptions {
  only?: string[];
  categories?: Category[];
}

export async function runRules(
  ctx: AuditContext,
  rules: Rule[],
  opts: RunRulesOptions = {},
): Promise<AuditReport> {
  const onlySet = opts.only ? new Set(opts.only) : null;
  const catSet = opts.categories ? new Set<Category>(opts.categories) : null;

  const buckets: Record<Category, CategoryReport> = {
    crawler: { score: 0, weight: CATEGORY_WEIGHTS.crawler, results: [] },
    'structured-data': { score: 0, weight: CATEGORY_WEIGHTS['structured-data'], results: [] },
    citation: { score: 0, weight: CATEGORY_WEIGHTS.citation, results: [] },
    content: { score: 0, weight: CATEGORY_WEIGHTS.content, results: [] },
  };

  for (const rule of rules) {
    if (onlySet && !onlySet.has(rule.id)) continue;
    if (catSet && !catSet.has(rule.category)) continue;

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

    buckets[rule.category].results.push({
      id: rule.id,
      title: rule.title,
      weight: rule.weight,
      ...result,
    });
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

  return {
    url: ctx.url,
    finalUrl: ctx.finalUrl,
    fetchedAt: ctx.fetchedAt,
    renderMode: ctx.renderMode,
    overall,
    categories: buckets,
    version: VERSION,
  };
}
