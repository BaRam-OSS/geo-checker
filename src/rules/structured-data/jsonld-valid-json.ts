import { defineRule } from '../../types.js';
import { hasParseError } from '../util.js';

export const jsonLdValidJsonRule = defineRule({
  id: 'sd.jsonld-valid-json',
  category: 'structured-data',
  weight: 3,
  title: 'JSON-LD blocks parse as valid JSON',
  description: 'Malformed JSON in an ld+json block is silently ignored by most consumers — a costly silent failure.',
  run(ctx) {
    if (ctx.jsonLd.length === 0) {
      return { status: 'skip', score: 0, rationale: 'No JSON-LD to validate.' };
    }
    if (hasParseError(ctx.jsonLd)) {
      return {
        status: 'fail',
        score: 0,
        rationale: 'One or more JSON-LD blocks failed to parse.',
        fixUrl: 'https://github.com/BaRam-OSS/geo-checker/blob/main/docs/rules/sd.jsonld-valid-json.md',
      };
    }
    return { status: 'pass', score: 1, rationale: 'All JSON-LD blocks parse cleanly.' };
  },
});
