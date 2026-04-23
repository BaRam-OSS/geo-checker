import { defineRule } from '../../types.js';
import { flattenJsonLd, getTypes, hasField } from '../util.js';

interface ItemListIssue {
  index: number;
  missing: string[];
}

function validateItemList(node: unknown): ItemListIssue[] {
  if (!node || typeof node !== 'object') return [];
  const items = (node as { itemListElement?: unknown }).itemListElement;
  if (!Array.isArray(items) || items.length === 0) return [{ index: -1, missing: ['itemListElement'] }];
  const issues: ItemListIssue[] = [];
  items.forEach((item, i) => {
    const missing: string[] = [];
    if (!hasField(item, 'position')) missing.push('position');
    if (!hasField(item, 'name') && !hasField(item, 'item')) missing.push('name');
    if (!hasField(item, 'item') && !hasField(item, 'name')) missing.push('item');
    if (missing.length > 0) issues.push({ index: i, missing });
  });
  return issues;
}

export const breadcrumbValidRule = defineRule({
  id: 'sd.breadcrumb-valid',
  stableId: 'sd.breadcrumb-valid',
  category: 'structured-data',
  group: 'opportunity',
  weight: 2,
  impact: 'medium',
  effort: 'medium',
  docsUrl: 'https://github.com/BaRam-OSS/geo-checker/blob/main/docs/rules.md#sdbreadcrumb-valid',
  title: 'BreadcrumbList items declare position, name, and item',
  description:
    'When BreadcrumbList JSON-LD is present, every itemListElement should set position (1-indexed), name, and item (URL) — otherwise AI engines cannot reconstruct the path.',
  run(ctx) {
    if (ctx.jsonLd.length === 0) {
      return { status: 'skip', score: 0, rationale: 'No JSON-LD to analyse.' };
    }
    const nodes = flattenJsonLd(ctx.jsonLd);
    const breadcrumbs = nodes.filter((n) => getTypes(n).includes('BreadcrumbList'));
    if (breadcrumbs.length === 0) {
      return { status: 'skip', score: 0, rationale: 'No BreadcrumbList present.' };
    }
    const allIssues: ItemListIssue[] = [];
    let totalItems = 0;
    for (const bc of breadcrumbs) {
      const items = (bc as { itemListElement?: unknown }).itemListElement;
      if (Array.isArray(items)) totalItems += items.length;
      allIssues.push(...validateItemList(bc));
    }
    if (allIssues.length === 0) {
      return {
        status: 'pass',
        score: 1,
        rationale: `BreadcrumbList(s) valid (${totalItems} items).`,
      };
    }
    const fatalCount = allIssues.length;
    const denom = Math.max(1, totalItems);
    const score = Math.max(0, 1 - fatalCount / denom);
    return {
      status: score < 0.5 ? 'fail' : 'warn',
      score,
      rationale: `${fatalCount} breadcrumb item(s) missing required fields.`,
      evidence: allIssues.slice(0, 5),
      fixHint: 'Each itemListElement needs { "@type": "ListItem", position: N, name, item }.',
      estimatedImpact: Math.round(2 * (1 - score)),
    };
  },
});
