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
  title_ko: '<h1> 태그 1개 여부',
  description: 'A single H1 tells AI engines the primary topic of the page without ambiguity.',
  run(ctx) {
    const n = ctx.$('h1').length;
    if (n === 1) return { status: 'pass', score: 1, rationale: 'Exactly one <h1>.', rationale_ko: '<h1>이 정확히 1개입니다.' };
    if (n === 0) {
      return {
        status: 'fail',
        score: 0,
        rationale: 'No <h1> on the page.',
        rationale_ko: '페이지에 <h1>이 없습니다.',
        fixUrl: 'https://github.com/BaRam-OSS/geo-checker/blob/main/docs/rules/cnt.single-h1.md',
      };
    }
    return {
      status: 'warn',
      score: Math.max(0.3, 1 / n),
      rationale: `Found ${n} <h1> tags; prefer one primary heading.`,
      rationale_ko: `<h1>이 ${n}개 있습니다. 대표 제목 1개만 사용하세요.`,
    };
  },
});
