import { defineRule } from '../../types.js';

export const imageAltRule = defineRule({
  id: 'cnt.image-alt',
  stableId: 'cnt.image-alt',
  category: 'content',
  group: 'opportunity',
  weight: 3,
  impact: 'medium',
  effort: 'medium',
  docsUrl: 'https://github.com/BaRam-OSS/geo-checker/blob/main/docs/rules.md#cntimage-alt',
  title: '≥80% of <img> have alt text',
  title_ko: '<img>의 80% 이상 alt 텍스트 보유 여부',
  description: 'Alt text gives AI engines a textual anchor for visual content and improves accessibility.',
  run(ctx) {
    const imgs = ctx.$('img');
    const total = imgs.length;
    if (total === 0) return { status: 'skip', score: 0, rationale: 'No <img> on the page.', rationale_ko: '페이지에 <img>가 없습니다.' };

    let withAlt = 0;
    imgs.each((_i, el) => {
      const alt = ctx.$(el).attr('alt');
      if (typeof alt === 'string' && alt.trim().length > 0) withAlt += 1;
    });
    const ratio = withAlt / total;
    if (ratio >= 0.8) {
      return { status: 'pass', score: 1, rationale: `${withAlt}/${total} images have alt (${Math.round(ratio * 100)}%).`, rationale_ko: `이미지 ${total}개 중 ${withAlt}개에 alt가 있습니다 (${Math.round(ratio * 100)}%).` };
    }
    return {
      status: 'warn',
      score: ratio,
      rationale: `Only ${withAlt}/${total} images have alt text (${Math.round(ratio * 100)}%). Aim for ≥80%.`,
      rationale_ko: `이미지 ${total}개 중 ${withAlt}개만 alt 텍스트가 있습니다 (${Math.round(ratio * 100)}%). 80% 이상을 목표로 하세요.`,
      fixUrl: 'https://github.com/BaRam-OSS/geo-checker/blob/main/docs/rules.md',
    };
  },
});
