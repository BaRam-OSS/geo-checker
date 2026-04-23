import { defineRule } from '../../types.js';
import { flattenJsonLd, hasField } from '../util.js';

export const datesRule = defineRule({
  id: 'cit.dates',
  category: 'citation',
  weight: 5,
  title: 'Publish / modified date is present',
  description: 'AI engines rank recent pages higher; expose datePublished via JSON-LD, <time datetime>, or article:published_time meta.',
  run(ctx) {
    for (const node of flattenJsonLd(ctx.jsonLd)) {
      if (hasField(node, 'datePublished')) {
        return { status: 'pass', score: 1, rationale: 'datePublished found in JSON-LD.' };
      }
    }
    const articleTime = ctx.$('head meta[property="article:published_time"]').attr('content')?.trim();
    if (articleTime) {
      return { status: 'pass', score: 1, rationale: `article:published_time = ${articleTime}.` };
    }
    const timeEl = ctx.$('time[datetime]').first().attr('datetime')?.trim();
    if (timeEl) {
      return { status: 'pass', score: 0.8, rationale: `<time datetime="${timeEl}"> found.` };
    }
    return {
      status: 'warn',
      score: 0,
      rationale: 'No publish date found (JSON-LD, meta article:published_time, or <time datetime>).',
      fixUrl: 'https://github.com/BaRam-OSS/geo-checker/blob/main/docs/rules/cit.dates.md',
    };
  },
});
