import { defineRule } from '../../types.js';

export const wordCountRule = defineRule({
  id: 'cnt.word-count',
  category: 'content',
  weight: 2,
  title: 'Page has enough body text',
  description: 'Thin pages (under ~100 words) are rarely cited by AI engines. Aim for ≥300 words of meaningful body copy.',
  run(ctx) {
    const $ = ctx.$;
    const clone = $('body').clone();
    clone.find('script, style, noscript, nav, header, footer, aside').remove();
    const text = clone.text().replace(/\s+/g, ' ').trim();
    const words = text ? text.split(' ').length : 0;
    if (words >= 300) return { status: 'pass', score: 1, rationale: `${words} words of body text.` };
    if (words >= 100) return { status: 'warn', score: 0.5, rationale: `Only ${words} words; aim for 300+.` };
    return {
      status: 'fail',
      score: 0,
      rationale: `Only ${words} words; too thin to be cited.`,
      fixUrl: 'https://github.com/BaRam-OSS/geo-checker/blob/main/docs/rules/cnt.word-count.md',
    };
  },
});
