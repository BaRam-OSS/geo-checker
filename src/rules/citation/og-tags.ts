import { defineRule } from '../../types.js';

const REQUIRED = ['og:title', 'og:type', 'og:url', 'og:image'] as const;

export const ogTagsRule = defineRule({
  id: 'cit.og-tags',
  category: 'citation',
  weight: 3,
  title: 'Open Graph tags are set',
  description: 'og:title/type/url/image power rich previews on AI chat, social, and messaging.',
  run(ctx) {
    const missing: string[] = [];
    for (const prop of REQUIRED) {
      const val = ctx.$(`head meta[property="${prop}"]`).attr('content')?.trim();
      if (!val) missing.push(prop);
    }
    if (missing.length === 0) {
      return { status: 'pass', score: 1, rationale: 'All required OG tags present.' };
    }
    const ratio = 1 - missing.length / REQUIRED.length;
    return {
      status: missing.length === REQUIRED.length ? 'fail' : 'warn',
      score: ratio,
      rationale: `Missing: ${missing.join(', ')}.`,
      fixUrl: 'https://github.com/BaRam-OSS/geo-checker/blob/main/docs/rules/cit.og-tags.md',
    };
  },
});
