import { defineRule } from '../../types.js';

export const canonicalRule = defineRule({
  id: 'cit.canonical',
  stableId: 'cit.canonical',
  category: 'citation',
  group: 'diagnostic',
  weight: 3,
  impact: 'high',
  effort: 'low',
  docsUrl: 'https://github.com/BaRam-OSS/geo-checker/blob/main/docs/rules.md#citcanonical',
  title: 'Canonical URL is declared',
  description: 'rel="canonical" tells crawlers which URL is the source of truth, preventing duplicate-citation confusion.',
  run(ctx) {
    const href = ctx.$('head link[rel="canonical"]').attr('href')?.trim();
    if (!href) {
      return {
        status: 'warn',
        score: 0,
        rationale: 'No <link rel="canonical"> found.',
        fixUrl: 'https://github.com/BaRam-OSS/geo-checker/blob/main/docs/rules.md',
      };
    }
    try {
      const abs = new URL(href, ctx.finalUrl).toString();
      return { status: 'pass', score: 1, rationale: `Canonical URL: ${abs}.` };
    } catch {
      return { status: 'fail', score: 0, rationale: `Canonical href is not a valid URL: ${href}` };
    }
  },
});
