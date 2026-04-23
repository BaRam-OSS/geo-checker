import { defineRule } from '../../types.js';
import { flattenJsonLd, hasField } from '../util.js';

export const authorVisibleRule = defineRule({
  id: 'cit.author-visible',
  category: 'citation',
  weight: 4,
  title: 'Author is declared',
  description: 'AI engines prefer citing content with an identifiable author; expose one via JSON-LD, meta[name=author], rel=author, or a .author class.',
  run(ctx) {
    for (const node of flattenJsonLd(ctx.jsonLd)) {
      if (hasField(node, 'author')) {
        return { status: 'pass', score: 1, rationale: 'Author found in JSON-LD.' };
      }
    }
    const metaAuthor = ctx.$('head meta[name="author"]').attr('content')?.trim();
    if (metaAuthor) return { status: 'pass', score: 1, rationale: `meta[name=author] = "${metaAuthor}".` };
    if (ctx.$('[rel="author"]').length > 0) {
      return { status: 'pass', score: 1, rationale: 'rel="author" link found.' };
    }
    if (ctx.$('.author, [class*="author"], [itemprop="author"]').length > 0) {
      return { status: 'pass', score: 0.8, rationale: 'Author-ish DOM selector found (weaker signal).' };
    }
    return {
      status: 'warn',
      score: 0,
      rationale: 'No author signal found (JSON-LD, meta, rel, or .author).',
      fixUrl: 'https://github.com/BaRam-OSS/geo-checker/blob/main/docs/rules.md',
    };
  },
});
