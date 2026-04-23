import { defineRule } from '../../types.js';
import { flattenJsonLd, getTypes, KNOWN_SCHEMA_TYPES } from '../util.js';

export const schemaTypeRecognizedRule = defineRule({
  id: 'sd.schema-type-recognized',
  stableId: 'sd.schema-type-recognized',
  category: 'structured-data',
  group: 'diagnostic',
  weight: 4,
  impact: 'high',
  effort: 'low',
  docsUrl: 'https://github.com/BaRam-OSS/geo-checker/blob/main/docs/rules.md#sdschema-type-recognized',
  title: 'Schema.org @type is a recognised kind',
  description: 'AI engines match pages against well-known types (Article, Product, FAQPage...). Obscure types weaken the signal.',
  run(ctx) {
    if (ctx.jsonLd.length === 0) {
      return { status: 'skip', score: 0, rationale: 'No JSON-LD to analyse.' };
    }
    const nodes = flattenJsonLd(ctx.jsonLd);
    const recognized = new Set<string>();
    const seenTypes = new Set<string>();
    for (const node of nodes) {
      for (const t of getTypes(node)) {
        seenTypes.add(t);
        if (KNOWN_SCHEMA_TYPES.includes(t)) recognized.add(t);
      }
    }
    if (recognized.size > 0) {
      return {
        status: 'pass',
        score: 1,
        rationale: `Recognised: ${[...recognized].join(', ')}.`,
        evidence: { recognized: [...recognized], all: [...seenTypes] },
      };
    }
    return {
      status: 'warn',
      score: 0.3,
      rationale: `No recognised schema.org types. Saw: ${[...seenTypes].join(', ') || '(none)'}.`,
      fixUrl: 'https://github.com/BaRam-OSS/geo-checker/blob/main/docs/rules.md',
    };
  },
});
