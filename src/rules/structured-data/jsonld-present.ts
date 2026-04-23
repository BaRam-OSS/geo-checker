import { defineRule } from '../../types.js';

export const jsonLdPresentRule = defineRule({
  id: 'sd.jsonld-present',
  category: 'structured-data',
  weight: 5,
  title: 'JSON-LD structured data is present',
  description: 'At least one <script type="application/ld+json"> block is the primary way AI engines map your page to an entity.',
  run(ctx) {
    if (ctx.jsonLd.length > 0) {
      return { status: 'pass', score: 1, rationale: `Found ${ctx.jsonLd.length} JSON-LD block(s).` };
    }
    return {
      status: 'fail',
      score: 0,
      rationale: 'No JSON-LD blocks found. Add schema.org structured data.',
      fixUrl: 'https://github.com/BaRam-OSS/geo-checker/blob/main/docs/rules/sd.jsonld-present.md',
    };
  },
});
