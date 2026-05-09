import { defineRule } from '../../types.js';

export const llmsTxtPresentRule = defineRule({
  id: 'crawler.llms-txt-present',
  stableId: 'crawler.llms-txt-present',
  category: 'crawler',
  group: 'opportunity',
  weight: 4,
  impact: 'medium',
  effort: 'medium',
  docsUrl: 'https://github.com/BaRam-OSS/geo-checker/blob/main/docs/rules.md#crawlerllms-txt-present',
  title: 'llms.txt is present',
  title_ko: 'llms.txt 파일 존재 여부',
  description: 'An /llms.txt file at the site root gives AI assistants a curated map of the most citation-worthy pages.',
  run(ctx) {
    if (ctx.llmsTxt) {
      return { status: 'pass', score: 1, rationale: 'llms.txt found at site root.', rationale_ko: 'llms.txt가 사이트 루트에 존재합니다.' };
    }
    return {
      status: 'warn',
      score: 0,
      rationale: 'No /llms.txt found. Add one to curate the pages AI assistants should read.',
      rationale_ko: '/llms.txt가 없습니다. AI 어시스턴트가 읽어야 할 페이지를 큐레이션하려면 추가하세요.',
      fixUrl: 'https://github.com/BaRam-OSS/geo-checker/blob/main/docs/rules.md',
    };
  },
});
