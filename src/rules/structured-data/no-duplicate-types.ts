import { defineRule } from '../../types.js';
import { flattenJsonLd, getTypes } from '../util.js';

const UNIQUE_TYPES = new Set(['Article', 'NewsArticle', 'BlogPosting', 'Product', 'Organization']);

export const noDuplicateTypesRule = defineRule({
  id: 'sd.no-duplicate-types',
  category: 'structured-data',
  weight: 2,
  title: 'No conflicting duplicate @types',
  description: 'Multiple competing entities of the same primary type (e.g. two Articles) confuse the engine about which one represents the page.',
  run(ctx) {
    if (ctx.jsonLd.length === 0) {
      return { status: 'skip', score: 0, rationale: 'No JSON-LD to analyse.' };
    }
    const counts = new Map<string, number>();
    for (const node of flattenJsonLd(ctx.jsonLd)) {
      for (const t of getTypes(node)) {
        if (UNIQUE_TYPES.has(t)) counts.set(t, (counts.get(t) ?? 0) + 1);
      }
    }
    const dupes = [...counts.entries()].filter(([, n]) => n > 1);
    if (dupes.length === 0) {
      return { status: 'pass', score: 1, rationale: 'No duplicate primary types.' };
    }
    return {
      status: 'warn',
      score: 0.4,
      rationale: `Duplicate primary types: ${dupes.map(([t, n]) => `${t}×${n}`).join(', ')}.`,
      fixUrl: 'https://github.com/BaRam-OSS/geo-checker/blob/main/docs/rules/sd.no-duplicate-types.md',
    };
  },
});
