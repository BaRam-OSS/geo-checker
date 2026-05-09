import { defineRule } from '../../types.js';

export const wordCountRule = defineRule({
  id: 'cnt.word-count',
  stableId: 'cnt.word-count',
  category: 'content',
  group: 'opportunity',
  weight: 2,
  impact: 'high',
  effort: 'high',
  docsUrl: 'https://github.com/BaRam-OSS/geo-checker/blob/main/docs/rules.md#cntword-count',
  title: 'Page has enough body text',
  title_ko: '충분한 본문 텍스트 여부',
  description: 'Thin pages (under ~100 words) are rarely cited by AI engines. Aim for ≥300 words of meaningful body copy.',
  run(ctx) {
    const $ = ctx.$;
    const clone = $('body').clone();
    clone.find('script, style, noscript, nav, header, footer, aside').remove();
    const text = clone.text().replace(/\s+/g, ' ').trim();
    const words = text ? text.split(' ').length : 0;
    if (words >= 300) return { status: 'pass', score: 1, rationale: `${words} words of body text.`, rationale_ko: `본문 텍스트가 ${words}단어 있습니다.` };
    if (words >= 100) return { status: 'warn', score: 0.5, rationale: `Only ${words} words; aim for 300+.`, rationale_ko: `${words}단어밖에 없습니다. 300단어 이상을 목표로 하세요.` };
    return {
      status: 'fail',
      score: 0,
      rationale: `Only ${words} words; too thin to be cited.`,
      rationale_ko: `${words}단어밖에 없습니다. AI 엔진이 인용하기엔 너무 적습니다.`,
      fixUrl: 'https://github.com/BaRam-OSS/geo-checker/blob/main/docs/rules.md',
    };
  },
});
