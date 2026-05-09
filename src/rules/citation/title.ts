import { defineRule } from '../../types.js';

export const titleRule = defineRule({
  id: 'cit.title',
  stableId: 'cit.title',
  category: 'citation',
  group: 'diagnostic',
  weight: 2,
  impact: 'critical',
  effort: 'low',
  docsUrl: 'https://github.com/BaRam-OSS/geo-checker/blob/main/docs/rules.md#cittitle',
  title: '<title> is set with a reasonable length',
  title_ko: '<title> 태그 적정 길이 설정 여부',
  description: 'The document title is the single most-cited piece of text and should be 10–70 characters.',
  run(ctx) {
    const title = ctx.$('head > title').first().text().trim();
    if (!title) {
      return {
        status: 'fail',
        score: 0,
        rationale: 'Page has no <title>.',
        rationale_ko: '페이지에 <title>이 없습니다.',
        fixUrl: 'https://github.com/BaRam-OSS/geo-checker/blob/main/docs/rules.md',
      };
    }
    if (title.length < 10) {
      return {
        status: 'warn',
        score: 0.4,
        rationale: `Title is only ${title.length} chars; consider a more descriptive one.`,
        rationale_ko: `제목이 ${title.length}자밖에 안 됩니다. 더 구체적으로 작성하세요.`,
      };
    }
    if (title.length > 70) {
      return {
        status: 'warn',
        score: 0.6,
        rationale: `Title is ${title.length} chars; search UIs commonly truncate after ~70.`,
        rationale_ko: `제목이 ${title.length}자입니다. 검색 UI에서 70자 이후는 잘릴 수 있습니다.`,
      };
    }
    return { status: 'pass', score: 1, rationale: `Title length ${title.length} is within range.`, rationale_ko: `제목 길이 ${title.length}자로 적절합니다.` };
  },
});
