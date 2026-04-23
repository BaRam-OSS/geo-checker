import { defineRule } from '../../types.js';

export const microdataFallbackRule = defineRule({
  id: 'sd.microdata-fallback',
  category: 'structured-data',
  weight: 2,
  title: 'Microdata or RDFa fallback when JSON-LD is missing',
  description: 'If JSON-LD is absent, inline microdata (itemscope/itemtype) or RDFa still gives some structured signal.',
  run(ctx) {
    if (ctx.jsonLd.length > 0) {
      return { status: 'skip', score: 0, rationale: 'JSON-LD is present; fallback not needed.' };
    }
    const microdata = ctx.$('[itemscope][itemtype]').length;
    const rdfa = ctx.$('[typeof][vocab], [typeof][property]').length;
    if (microdata > 0 || rdfa > 0) {
      return {
        status: 'pass',
        score: 1,
        rationale: `Found ${microdata} microdata and ${rdfa} RDFa nodes.`,
      };
    }
    return {
      status: 'fail',
      score: 0,
      rationale: 'No structured data at all (no JSON-LD, no microdata, no RDFa).',
      fixUrl: 'https://github.com/BaRam-OSS/geo-checker/blob/main/docs/rules/sd.microdata-fallback.md',
    };
  },
});
