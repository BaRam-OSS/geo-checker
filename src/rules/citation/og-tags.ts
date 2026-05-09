import { defineRule } from '../../types.js';

const REQUIRED = ['og:title', 'og:type', 'og:url', 'og:image'] as const;

export const ogTagsRule = defineRule({
  id: 'cit.og-tags',
  stableId: 'cit.og-tags',
  category: 'citation',
  group: 'opportunity',
  weight: 3,
  impact: 'high',
  effort: 'low',
  docsUrl: 'https://github.com/BaRam-OSS/geo-checker/blob/main/docs/rules.md#citog-tags',
  title: 'Open Graph tags are set',
  title_ko: 'Open Graph 태그 설정 여부',
  description: 'og:title/type/url/image power rich previews on AI chat, social, and messaging.',
  run(ctx) {
    const missing: string[] = [];
    for (const prop of REQUIRED) {
      const val = ctx.$(`head meta[property="${prop}"]`).attr('content')?.trim();
      if (!val) missing.push(prop);
    }
    if (missing.length === 0) {
      return { status: 'pass', score: 1, rationale: 'All required OG tags present.', rationale_ko: '필수 OG 태그가 모두 있습니다.' };
    }
    const ratio = 1 - missing.length / REQUIRED.length;
    return {
      status: missing.length === REQUIRED.length ? 'fail' : 'warn',
      score: ratio,
      rationale: `Missing: ${missing.join(', ')}.`,
      rationale_ko: `누락된 태그: ${missing.join(', ')}.`,
      fixUrl: 'https://github.com/BaRam-OSS/geo-checker/blob/main/docs/rules.md',
    };
  },
});
