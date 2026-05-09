import { defineRule } from '../../types.js';

export const metaDescriptionRule = defineRule({
  id: 'cit.meta-description',
  stableId: 'cit.meta-description',
  category: 'citation',
  group: 'opportunity',
  weight: 2,
  impact: 'high',
  effort: 'low',
  docsUrl: 'https://github.com/BaRam-OSS/geo-checker/blob/main/docs/rules.md#citmeta-description',
  title: 'meta description is set (50–160 chars)',
  title_ko: 'meta description 설정 여부 (50–160자)',
  description: 'AI snippets often quote the meta description verbatim; aim for 50–160 chars.',
  run(ctx) {
    const desc = ctx.$('head meta[name="description"]').attr('content')?.trim() ?? '';
    if (!desc) {
      return {
        status: 'warn',
        score: 0,
        rationale: 'No meta description set.',
        rationale_ko: 'meta description이 없습니다.',
        fixUrl: 'https://github.com/BaRam-OSS/geo-checker/blob/main/docs/rules.md',
      };
    }
    if (desc.length < 50) {
      return { status: 'warn', score: 0.5, rationale: `Only ${desc.length} chars; aim for 50+.`, rationale_ko: `${desc.length}자밖에 안 됩니다. 50자 이상을 목표로 하세요.` };
    }
    if (desc.length > 160) {
      return { status: 'warn', score: 0.7, rationale: `${desc.length} chars; may be truncated after 160.`, rationale_ko: `${desc.length}자입니다. 160자 이후는 잘릴 수 있습니다.` };
    }
    return { status: 'pass', score: 1, rationale: `Description length ${desc.length} is within range.`, rationale_ko: `설명 길이 ${desc.length}자로 적절합니다.` };
  },
});
