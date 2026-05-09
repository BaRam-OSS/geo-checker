import { defineRule } from '../../types.js';

export const microdataFallbackRule = defineRule({
  id: 'sd.microdata-fallback',
  stableId: 'sd.microdata-fallback',
  category: 'structured-data',
  group: 'diagnostic',
  weight: 2,
  impact: 'medium',
  effort: 'medium',
  docsUrl: 'https://github.com/BaRam-OSS/geo-checker/blob/main/docs/rules.md#sdmicrodata-fallback',
  title: 'Microdata or RDFa fallback when JSON-LD is missing',
  title_ko: 'JSON-LD 없을 때 Microdata/RDFa 대체 여부',
  description: 'If JSON-LD is absent, inline microdata (itemscope/itemtype) or RDFa still gives some structured signal.',
  run(ctx) {
    if (ctx.jsonLd.length > 0) {
      return { status: 'skip', score: 0, rationale: 'JSON-LD is present; fallback not needed.', rationale_ko: 'JSON-LD가 있으므로 대체 수단이 필요하지 않습니다.' };
    }
    const microdata = ctx.$('[itemscope][itemtype]').length;
    const rdfa = ctx.$('[typeof][vocab], [typeof][property]').length;
    if (microdata > 0 || rdfa > 0) {
      return {
        status: 'pass',
        score: 1,
        rationale: `Found ${microdata} microdata and ${rdfa} RDFa nodes.`,
        rationale_ko: `Microdata ${microdata}개, RDFa ${rdfa}개 발견됩니다.`,
      };
    }
    return {
      status: 'fail',
      score: 0,
      rationale: 'No structured data at all (no JSON-LD, no microdata, no RDFa).',
      rationale_ko: '구조화 데이터가 전혀 없습니다 (JSON-LD, Microdata, RDFa 모두 없음).',
      fixUrl: 'https://github.com/BaRam-OSS/geo-checker/blob/main/docs/rules.md',
    };
  },
});
