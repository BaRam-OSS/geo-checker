import { defineRule } from '../../types.js';
import { flattenJsonLd, hasField } from '../util.js';

export const authorVisibleRule = defineRule({
  id: 'cit.author-visible',
  stableId: 'cit.author-visible',
  category: 'citation',
  group: 'opportunity',
  weight: 4,
  impact: 'high',
  effort: 'medium',
  docsUrl: 'https://github.com/BaRam-OSS/geo-checker/blob/main/docs/rules.md#citauthor-visible',
  title: 'Author is declared',
  title_ko: '작성자 정보 선언 여부',
  description: 'AI engines prefer citing content with an identifiable author; expose one via JSON-LD, meta[name=author], rel=author, or a .author class.',
  run(ctx) {
    for (const node of flattenJsonLd(ctx.jsonLd)) {
      if (hasField(node, 'author')) {
        return { status: 'pass', score: 1, rationale: 'Author found in JSON-LD.', rationale_ko: 'JSON-LD에서 작성자 정보를 찾았습니다.' };
      }
    }
    const metaAuthor = ctx.$('head meta[name="author"]').attr('content')?.trim();
    if (metaAuthor) return { status: 'pass', score: 1, rationale: `meta[name=author] = "${metaAuthor}".`, rationale_ko: `meta[name=author] = "${metaAuthor}".` };
    if (ctx.$('[rel="author"]').length > 0) {
      return { status: 'pass', score: 1, rationale: 'rel="author" link found.', rationale_ko: 'rel="author" 링크를 찾았습니다.' };
    }
    if (ctx.$('.author, [class*="author"], [itemprop="author"]').length > 0) {
      return { status: 'pass', score: 0.8, rationale: 'Author-ish DOM selector found (weaker signal).', rationale_ko: '작성자 관련 DOM 선택자가 있습니다 (신호 강도 낮음).' };
    }
    return {
      status: 'warn',
      score: 0,
      rationale: 'No author signal found (JSON-LD, meta, rel, or .author).',
      rationale_ko: '작성자 정보가 없습니다 (JSON-LD, meta, rel, .author 모두 없음).',
      fixUrl: 'https://github.com/BaRam-OSS/geo-checker/blob/main/docs/rules.md',
    };
  },
});
