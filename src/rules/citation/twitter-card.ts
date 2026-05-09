import { defineRule } from '../../types.js';

export const twitterCardRule = defineRule({
  id: 'cit.twitter-card',
  stableId: 'cit.twitter-card',
  category: 'citation',
  group: 'opportunity',
  weight: 2,
  impact: 'low',
  effort: 'low',
  docsUrl: 'https://github.com/BaRam-OSS/geo-checker/blob/main/docs/rules.md#cittwitter-card',
  title: 'Twitter Card metadata is set',
  title_ko: 'Twitter Card 메타데이터 설정 여부',
  description: 'twitter:card + twitter:title give better previews on X/Twitter and some AI surfaces that reuse the tags.',
  run(ctx) {
    const card = ctx.$('head meta[name="twitter:card"]').attr('content')?.trim();
    const title = ctx.$('head meta[name="twitter:title"]').attr('content')?.trim();
    if (card && title) {
      return { status: 'pass', score: 1, rationale: `Card type: ${card}.`, rationale_ko: `카드 유형: ${card}.` };
    }
    if (card || title) {
      return { status: 'warn', score: 0.5, rationale: 'Partial twitter:* metadata; add the missing tag.', rationale_ko: 'twitter:* 메타데이터가 일부만 있습니다. 누락된 태그를 추가하세요.' };
    }
    return {
      status: 'warn',
      score: 0,
      rationale: 'No twitter:card metadata.',
      rationale_ko: 'twitter:card 메타데이터가 없습니다.',
      fixUrl: 'https://github.com/BaRam-OSS/geo-checker/blob/main/docs/rules.md',
    };
  },
});
