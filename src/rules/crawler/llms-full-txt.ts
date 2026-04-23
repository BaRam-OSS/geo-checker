import { defineRule } from '../../types.js';

export const llmsFullTxtRule = defineRule({
  id: 'crawler.llms-full-txt',
  stableId: 'crawler.llms-full-txt',
  category: 'crawler',
  group: 'opportunity',
  weight: 2,
  impact: 'medium',
  effort: 'medium',
  docsUrl: 'https://github.com/BaRam-OSS/geo-checker/blob/main/docs/rules.md#crawlerllms-full-txt',
  title: 'llms-full.txt provides full-content mirror',
  description:
    'Complement /llms.txt with /llms-full.txt containing the full body of every cited page. AI assistants can ingest it in one request instead of crawling every URL.',
  run(ctx) {
    if (ctx.llmsFullTxt && ctx.llmsFullTxt.length > 200) {
      return {
        status: 'pass',
        score: 1,
        rationale: `/llms-full.txt found (${ctx.llmsFullTxt.length.toLocaleString()} chars).`,
      };
    }
    if (ctx.llmsFullTxt) {
      return {
        status: 'warn',
        score: 0.5,
        rationale: `/llms-full.txt found but very short (${ctx.llmsFullTxt.length} chars). Consider expanding with page bodies.`,
        fixHint: 'Mirror full article bodies into /llms-full.txt so AI assistants can quote without re-crawling.',
      };
    }
    return {
      status: 'warn',
      score: 0,
      rationale:
        'No /llms-full.txt found. Adding one lets AI assistants ingest the full corpus in a single request.',
      fixHint: 'Publish /llms-full.txt alongside /llms.txt with the full body text of your top pages.',
      estimatedImpact: 1,
    };
  },
});
