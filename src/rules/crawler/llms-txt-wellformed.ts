import { defineRule } from '../../types.js';
import { isLlmsTxtWellFormed } from '../../fetcher/llms-txt.js';

export const llmsTxtWellformedRule = defineRule({
  id: 'crawler.llms-txt-wellformed',
  category: 'crawler',
  weight: 3,
  title: 'llms.txt follows the spec',
  description: 'Must start with an H1 project title, then a brief summary, then at least one H2 section containing link items.',
  run(ctx) {
    if (!ctx.llmsTxt) {
      return { status: 'skip', score: 0, rationale: 'No llms.txt to validate.' };
    }
    const check = isLlmsTxtWellFormed(ctx.llmsTxt);
    if (check.ok) {
      const totalLinks = ctx.llmsTxt.sections.reduce((n, s) => n + s.links.length, 0);
      return {
        status: 'pass',
        score: 1,
        rationale: `Well-formed with ${ctx.llmsTxt.sections.length} section(s) and ${totalLinks} link(s).`,
      };
    }
    return {
      status: 'warn',
      score: 0.3,
      rationale: `llms.txt does not fully match the spec: ${check.reason}.`,
      fixUrl: 'https://github.com/BaRam-OSS/geo-checker/blob/main/docs/rules/crawler.llms-txt-wellformed.md',
    };
  },
});
