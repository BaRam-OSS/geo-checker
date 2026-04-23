import { defineRule } from '../../types.js';
import { flattenJsonLd, getTypes } from '../util.js';

const ARTICLE_TYPES = new Set(['Article', 'NewsArticle', 'BlogPosting', 'Report', 'TechArticle']);
const ONE_DAY = 24 * 60 * 60 * 1000;

function pickDate(node: unknown, field: string): string | undefined {
  if (!node || typeof node !== 'object') return undefined;
  const v = (node as Record<string, unknown>)[field];
  return typeof v === 'string' && v.trim() ? v.trim() : undefined;
}

function parseDateMs(s: string): number | null {
  const t = Date.parse(s);
  return Number.isNaN(t) ? null : t;
}

export const contentFreshnessRule = defineRule({
  id: 'cit.content-freshness',
  stableId: 'cit.content-freshness',
  category: 'citation',
  group: 'opportunity',
  weight: 3,
  impact: 'high',
  effort: 'low',
  docsUrl: 'https://github.com/BaRam-OSS/geo-checker/blob/main/docs/rules.md#citcontent-freshness',
  title: 'Article content is fresh (dateModified within 1 year)',
  description:
    'AI engines down-rank stale content. Surface a recent dateModified (≤365 days) on Article-like pages so retrieval rankings stay strong.',
  run(ctx) {
    const nodes = flattenJsonLd(ctx.jsonLd);
    const articles = nodes.filter((n) => getTypes(n).some((t) => ARTICLE_TYPES.has(t)));
    if (articles.length === 0) {
      return {
        status: 'skip',
        score: 0,
        rationale: 'No Article/BlogPosting/NewsArticle JSON-LD; freshness signal not applicable.',
      };
    }
    let bestMs: number | null = null;
    let usedField: 'dateModified' | 'datePublished' | null = null;
    for (const a of articles) {
      const mod = pickDate(a, 'dateModified');
      const pub = pickDate(a, 'datePublished');
      const candidate = mod ?? pub;
      if (!candidate) continue;
      const ms = parseDateMs(candidate);
      if (ms === null) continue;
      if (bestMs === null || ms > bestMs) {
        bestMs = ms;
        usedField = mod ? 'dateModified' : 'datePublished';
      }
    }
    if (bestMs === null) {
      return {
        status: 'warn',
        score: 0,
        rationale: 'Article has no parseable dateModified or datePublished.',
        fixHint: 'Add ISO-8601 dateModified and datePublished to your Article JSON-LD.',
        estimatedImpact: 3,
      };
    }
    const ageDays = Math.round((Date.now() - bestMs) / ONE_DAY);
    if (ageDays <= 365) {
      return {
        status: 'pass',
        score: 1,
        rationale: `${usedField} within the last year (~${ageDays} day${ageDays === 1 ? '' : 's'} ago).`,
        evidence: { ageDays, field: usedField },
      };
    }
    if (ageDays <= 730) {
      return {
        status: 'warn',
        score: 0.6,
        rationale: `${usedField} is ${ageDays} days old. Refresh within a year for best AI ranking.`,
        evidence: { ageDays, field: usedField },
        estimatedImpact: 2,
      };
    }
    return {
      status: 'warn',
      score: 0.2,
      rationale: `${usedField} is ${ageDays} days old (>2 years). AI engines treat this as stale.`,
      evidence: { ageDays, field: usedField },
      fixHint: 'Update content and bump dateModified to today\'s date.',
      estimatedImpact: 3,
    };
  },
});
