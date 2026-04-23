import { defineRule } from '../../types.js';

export const langAttrRule = defineRule({
  id: 'cit.lang-attr',
  stableId: 'cit.lang-attr',
  category: 'citation',
  group: 'diagnostic',
  weight: 2,
  impact: 'medium',
  effort: 'low',
  docsUrl: 'https://github.com/BaRam-OSS/geo-checker/blob/main/docs/rules.md#citlang-attr',
  title: '<html lang> is set',
  description: 'A lang attribute helps AI engines route the page to the right-language search surface (and helps screen readers).',
  run(ctx) {
    const lang = ctx.$('html').attr('lang')?.trim();
    if (!lang) {
      return {
        status: 'warn',
        score: 0,
        rationale: 'No lang attribute on <html>.',
        fixUrl: 'https://github.com/BaRam-OSS/geo-checker/blob/main/docs/rules.md',
      };
    }
    return { status: 'pass', score: 1, rationale: `lang="${lang}".` };
  },
});
