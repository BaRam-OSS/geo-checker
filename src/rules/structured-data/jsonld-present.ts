import { defineRule } from '../../types.js';

export const jsonLdPresentRule = defineRule({
  id: 'sd.jsonld-present',
  stableId: 'sd.jsonld-present',
  category: 'structured-data',
  group: 'diagnostic',
  weight: 5,
  impact: 'critical',
  effort: 'medium',
  docsUrl: 'https://github.com/BaRam-OSS/geo-checker/blob/main/docs/rules.md#sdjsonld-present',
  title: 'JSON-LD structured data is present',
  title_ko: 'JSON-LD 구조화 데이터 존재 여부',
  description: 'At least one <script type="application/ld+json"> block is the primary way AI engines map your page to an entity.',
  run(ctx) {
    if (ctx.jsonLd.length > 0) {
      return { status: 'pass', score: 1, rationale: `Found ${ctx.jsonLd.length} JSON-LD block(s).`, rationale_ko: `JSON-LD 블록이 ${ctx.jsonLd.length}개 있습니다.` };
    }
    return {
      status: 'fail',
      score: 0,
      rationale: 'No JSON-LD blocks found. Add schema.org structured data.',
      rationale_ko: 'JSON-LD 블록이 없습니다. schema.org 구조화 데이터를 추가하세요.',
      fixUrl: 'https://github.com/BaRam-OSS/geo-checker/blob/main/docs/rules.md',
    };
  },
});
