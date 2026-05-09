import { defineRule } from '../../types.js';

export const headingHierarchyRule = defineRule({
  id: 'cnt.heading-hierarchy',
  stableId: 'cnt.heading-hierarchy',
  category: 'content',
  group: 'diagnostic',
  weight: 3,
  impact: 'medium',
  effort: 'medium',
  docsUrl: 'https://github.com/BaRam-OSS/geo-checker/blob/main/docs/rules.md#cntheading-hierarchy',
  title: 'Heading levels do not skip',
  title_ko: '제목 단계 순서 준수 여부',
  description: 'Going from H2 directly to H4 breaks the outline AI engines use to segment content.',
  run(ctx) {
    const levels: number[] = [];
    ctx.$('h1, h2, h3, h4, h5, h6').each((_i, el) => {
      const name = (el as { tagName?: string }).tagName?.toLowerCase() ?? 'h1';
      const m = /^h([1-6])$/.exec(name);
      if (m?.[1]) levels.push(parseInt(m[1], 10));
    });
    if (levels.length === 0) {
      return { status: 'skip', score: 0, rationale: 'No headings found.', rationale_ko: '제목 태그가 없습니다.' };
    }
    const skips: Array<{ from: number; to: number }> = [];
    for (let i = 1; i < levels.length; i++) {
      const prev = levels[i - 1]!;
      const curr = levels[i]!;
      if (curr > prev + 1) skips.push({ from: prev, to: curr });
    }
    if (skips.length === 0) {
      return { status: 'pass', score: 1, rationale: 'No heading-level skips.', rationale_ko: '제목 단계가 순서대로 사용됩니다.' };
    }
    return {
      status: 'warn',
      score: Math.max(0.3, 1 - skips.length / levels.length),
      rationale: `${skips.length} heading skip(s) detected (e.g. h${skips[0]!.from}→h${skips[0]!.to}).`,
      rationale_ko: `제목 단계 건너뜀이 ${skips.length}개 감지됩니다 (예: h${skips[0]!.from}→h${skips[0]!.to}).`,
      fixUrl: 'https://github.com/BaRam-OSS/geo-checker/blob/main/docs/rules.md',
    };
  },
});
