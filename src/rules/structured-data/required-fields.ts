import { defineRule } from '../../types.js';
import { flattenJsonLd, getTypes, hasField, REQUIRED_FIELDS } from '../util.js';

export const requiredFieldsRule = defineRule({
  id: 'sd.required-fields',
  stableId: 'sd.required-fields',
  category: 'structured-data',
  group: 'opportunity',
  weight: 6,
  impact: 'high',
  effort: 'medium',
  docsUrl: 'https://github.com/BaRam-OSS/geo-checker/blob/main/docs/rules.md#sdrequired-fields',
  title: 'Required fields for recognised types are set',
  title_ko: '인식된 타입의 필수 필드 충족 여부',
  description: 'Article needs headline/author/datePublished, FAQPage needs mainEntity, Product needs offers, etc.',
  run(ctx) {
    if (ctx.jsonLd.length === 0) {
      return { status: 'skip', score: 0, rationale: 'No JSON-LD to analyse.', rationale_ko: '분석할 JSON-LD가 없습니다.' };
    }
    const nodes = flattenJsonLd(ctx.jsonLd);
    const missing: Array<{ type: string; field: string }> = [];
    const checked: string[] = [];
    for (const node of nodes) {
      for (const t of getTypes(node)) {
        const required = REQUIRED_FIELDS[t];
        if (!required) continue;
        checked.push(t);
        for (const f of required) {
          if (!hasField(node, f)) missing.push({ type: t, field: f });
        }
      }
    }
    if (checked.length === 0) {
      return {
        status: 'skip',
        score: 0,
        rationale: 'No types with known required fields were found.',
        rationale_ko: '필수 필드가 정의된 타입이 없습니다.',
      };
    }
    if (missing.length === 0) {
      return {
        status: 'pass',
        score: 1,
        rationale: `Required fields set on ${checked.length} node(s).`,
        rationale_ko: `${checked.length}개 노드의 필수 필드가 모두 충족됩니다.`,
      };
    }
    const msg = missing.map((m) => `${m.type}.${m.field}`).join(', ');
    return {
      status: 'fail',
      score: Math.max(0, 1 - missing.length / (checked.length * 2)),
      rationale: `Missing required fields: ${msg}.`,
      rationale_ko: `누락된 필수 필드: ${msg}.`,
      evidence: missing,
      fixUrl: 'https://github.com/BaRam-OSS/geo-checker/blob/main/docs/rules.md',
    };
  },
});
