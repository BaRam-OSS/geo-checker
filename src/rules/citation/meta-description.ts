import { defineRule } from '../../types.js';

export const metaDescriptionRule = defineRule({
  id: 'cit.meta-description',
  category: 'citation',
  weight: 2,
  title: 'meta description is set (50–160 chars)',
  description: 'AI snippets often quote the meta description verbatim; aim for 50–160 chars.',
  run(ctx) {
    const desc = ctx.$('head meta[name="description"]').attr('content')?.trim() ?? '';
    if (!desc) {
      return {
        status: 'warn',
        score: 0,
        rationale: 'No meta description set.',
        fixUrl: 'https://github.com/BaRam-OSS/geo-checker/blob/main/docs/rules.md',
      };
    }
    if (desc.length < 50) {
      return { status: 'warn', score: 0.5, rationale: `Only ${desc.length} chars; aim for 50+.` };
    }
    if (desc.length > 160) {
      return { status: 'warn', score: 0.7, rationale: `${desc.length} chars; may be truncated after 160.` };
    }
    return { status: 'pass', score: 1, rationale: `Description length ${desc.length} is within range.` };
  },
});
