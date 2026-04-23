import { defineRule } from '../../types.js';
import { flattenJsonLd, getTypes, hasField, REQUIRED_FIELDS } from '../util.js';

export const requiredFieldsRule = defineRule({
  id: 'sd.required-fields',
  category: 'structured-data',
  weight: 6,
  title: 'Required fields for recognised types are set',
  description: 'Article needs headline/author/datePublished, FAQPage needs mainEntity, Product needs offers, etc.',
  run(ctx) {
    if (ctx.jsonLd.length === 0) {
      return { status: 'skip', score: 0, rationale: 'No JSON-LD to analyse.' };
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
      };
    }
    if (missing.length === 0) {
      return {
        status: 'pass',
        score: 1,
        rationale: `Required fields set on ${checked.length} node(s).`,
      };
    }
    const msg = missing.map((m) => `${m.type}.${m.field}`).join(', ');
    return {
      status: 'fail',
      score: Math.max(0, 1 - missing.length / (checked.length * 2)),
      rationale: `Missing required fields: ${msg}.`,
      evidence: missing,
      fixUrl: 'https://github.com/BaRam-OSS/geo-checker/blob/main/docs/rules/sd.required-fields.md',
    };
  },
});
