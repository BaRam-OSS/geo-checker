import { defineRule } from '../../types.js';

export const llmsTxtPresentRule = defineRule({
  id: 'crawler.llms-txt-present',
  category: 'crawler',
  weight: 4,
  title: 'llms.txt is present',
  description: 'An /llms.txt file at the site root gives AI assistants a curated map of the most citation-worthy pages.',
  run(ctx) {
    if (ctx.llmsTxt) {
      return { status: 'pass', score: 1, rationale: 'llms.txt found at site root.' };
    }
    return {
      status: 'warn',
      score: 0,
      rationale: 'No /llms.txt found. Add one to curate the pages AI assistants should read.',
      fixUrl: 'https://github.com/BaRam-OSS/geo-checker/blob/main/docs/rules.md',
    };
  },
});
