import { defineRule } from '../../types.js';

export const twitterCardRule = defineRule({
  id: 'cit.twitter-card',
  category: 'citation',
  weight: 2,
  title: 'Twitter Card metadata is set',
  description: 'twitter:card + twitter:title give better previews on X/Twitter and some AI surfaces that reuse the tags.',
  run(ctx) {
    const card = ctx.$('head meta[name="twitter:card"]').attr('content')?.trim();
    const title = ctx.$('head meta[name="twitter:title"]').attr('content')?.trim();
    if (card && title) {
      return { status: 'pass', score: 1, rationale: `Card type: ${card}.` };
    }
    if (card || title) {
      return { status: 'warn', score: 0.5, rationale: 'Partial twitter:* metadata; add the missing tag.' };
    }
    return {
      status: 'warn',
      score: 0,
      rationale: 'No twitter:card metadata.',
      fixUrl: 'https://github.com/BaRam-OSS/geo-checker/blob/main/docs/rules/cit.twitter-card.md',
    };
  },
});
