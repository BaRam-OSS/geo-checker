import { defineRule } from '../../types.js';
import { hasParseError } from '../util.js';

export const jsonLdValidJsonRule = defineRule({
  id: 'sd.jsonld-valid-json',
  stableId: 'sd.jsonld-valid-json',
  category: 'structured-data',
  group: 'diagnostic',
  weight: 3,
  impact: 'high',
  effort: 'low',
  docsUrl: 'https://github.com/BaRam-OSS/geo-checker/blob/main/docs/rules.md#sdjsonld-valid-json',
  title: 'JSON-LD blocks parse as valid JSON',
  title_ko: 'JSON-LD 블록의 JSON 유효성',
  description: 'Malformed JSON in an ld+json block is silently ignored by most consumers — a costly silent failure.',
  run(ctx) {
    if (ctx.jsonLd.length === 0) {
      return { status: 'skip', score: 0, rationale: 'No JSON-LD to validate.', rationale_ko: '검증할 JSON-LD가 없습니다.' };
    }
    if (hasParseError(ctx.jsonLd)) {
      return {
        status: 'fail',
        score: 0,
        rationale: 'One or more JSON-LD blocks failed to parse.',
        rationale_ko: 'JSON-LD 블록 하나 이상을 파싱하지 못했습니다.',
        fixUrl: 'https://github.com/BaRam-OSS/geo-checker/blob/main/docs/rules.md',
      };
    }
    return { status: 'pass', score: 1, rationale: 'All JSON-LD blocks parse cleanly.', rationale_ko: '모든 JSON-LD 블록이 올바르게 파싱됩니다.' };
  },
});
