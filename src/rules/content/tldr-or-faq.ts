import { defineRule } from '../../types.js';
import { flattenJsonLd, getTypes } from '../util.js';

export const tldrOrFaqRule = defineRule({
  id: 'cnt.tldr-or-faq',
  stableId: 'cnt.tldr-or-faq',
  category: 'content',
  group: 'opportunity',
  weight: 5,
  impact: 'high',
  effort: 'medium',
  docsUrl: 'https://github.com/BaRam-OSS/geo-checker/blob/main/docs/rules.md#cnttldr-or-faq',
  title: 'TL;DR summary or FAQ block',
  description: 'AI engines strongly prefer content with a quotable summary or FAQ — it makes the page "citation-ready".',
  run(ctx) {
    for (const node of flattenJsonLd(ctx.jsonLd)) {
      if (getTypes(node).includes('FAQPage')) {
        return { status: 'pass', score: 1, rationale: 'FAQPage schema present.' };
      }
    }
    const sel = [
      'section[id*="tldr" i]',
      'section[id*="summary" i]',
      'section[id*="faq" i]',
      '.tldr',
      '.summary',
      '.faq',
      '[data-tldr]',
    ].join(', ');
    if (ctx.$(sel).length > 0) {
      return { status: 'pass', score: 0.85, rationale: 'TL;DR / summary / FAQ region detected by selector.' };
    }
    return {
      status: 'warn',
      score: 0,
      rationale: 'No TL;DR / summary / FAQ found; add one to boost AI citation odds.',
      fixUrl: 'https://github.com/BaRam-OSS/geo-checker/blob/main/docs/rules.md',
    };
  },
});
