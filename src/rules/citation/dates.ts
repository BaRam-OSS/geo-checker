import { defineRule } from '../../types.js';
import { flattenJsonLd, hasField } from '../util.js';

export const datesRule = defineRule({
  id: 'cit.dates',
  stableId: 'cit.dates',
  category: 'citation',
  group: 'opportunity',
  weight: 5,
  impact: 'high',
  effort: 'low',
  docsUrl: 'https://github.com/BaRam-OSS/geo-checker/blob/main/docs/rules.md#citdates',
  title: 'Publish / modified date is present',
  title_ko: '발행일 / 수정일 존재 여부',
  description: 'AI engines rank recent pages higher; expose datePublished via JSON-LD, <time datetime>, or article:published_time meta.',
  run(ctx) {
    for (const node of flattenJsonLd(ctx.jsonLd)) {
      if (hasField(node, 'datePublished')) {
        return { status: 'pass', score: 1, rationale: 'datePublished found in JSON-LD.', rationale_ko: 'JSON-LD에서 datePublished를 찾았습니다.' };
      }
    }
    const articleTime = ctx.$('head meta[property="article:published_time"]').attr('content')?.trim();
    if (articleTime) {
      return { status: 'pass', score: 1, rationale: `article:published_time = ${articleTime}.`, rationale_ko: `article:published_time = ${articleTime}.` };
    }
    const timeEl = ctx.$('time[datetime]').first().attr('datetime')?.trim();
    if (timeEl) {
      return { status: 'pass', score: 0.8, rationale: `<time datetime="${timeEl}"> found.`, rationale_ko: `<time datetime="${timeEl}">를 찾았습니다.` };
    }
    return {
      status: 'warn',
      score: 0,
      rationale: 'No publish date found (JSON-LD, meta article:published_time, or <time datetime>).',
      rationale_ko: '발행일이 없습니다 (JSON-LD, meta article:published_time, <time datetime> 모두 없음).',
      fixUrl: 'https://github.com/BaRam-OSS/geo-checker/blob/main/docs/rules.md',
    };
  },
});
