import { defineRule } from '../../types.js';

export const singleH1Rule = defineRule({
  id: 'cnt.single-h1',
  stableId: 'cnt.single-h1',
  category: 'content',
  group: 'diagnostic',
  weight: 3,
  impact: 'high',
  effort: 'low',
  docsUrl: 'https://github.com/BaRam-OSS/geo-checker/blob/main/docs/rules.md#cntsingle-h1',
  title: 'Exactly one <h1>',
  description: 'A single H1 tells AI engines the primary topic of the page without ambiguity.',
  run(ctx) {
    const n = ctx.$('h1').length;
    if (n === 1) return { status: 'pass', score: 1, rationale: 'Exactly one <h1>.' };
    if (n === 0) {
      return {
        status: 'fail',
        score: 0,
        rationale: 'No <h1> on the page.',
        fixUrl: 'https://github.com/BaRam-OSS/geo-checker/blob/main/docs/rules/cnt.single-h1.md',
      };
    }
    return {
      status: 'warn',
      score: Math.max(0.3, 1 / n),
      rationale: `Found ${n} <h1> tags; prefer one primary heading.`,
    };
  },
});
