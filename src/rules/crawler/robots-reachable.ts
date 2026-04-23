import { defineRule } from '../../types.js';

export const robotsReachableRule = defineRule({
  id: 'crawler.robots-reachable',
  category: 'crawler',
  weight: 2,
  title: 'robots.txt is reachable',
  description: 'A reachable robots.txt lets crawlers confirm their permissions; missing file is treated as allow-all but blocks explicit signalling.',
  run(ctx) {
    if (ctx.robots) {
      return { status: 'pass', score: 1, rationale: 'robots.txt returned successfully.' };
    }
    return {
      status: 'warn',
      score: 0.3,
      rationale: 'robots.txt is missing. Add one even if empty to explicitly signal crawl policy.',
      fixUrl: 'https://github.com/BaRam-OSS/geo-checker/blob/main/docs/rules/crawler.robots-reachable.md',
    };
  },
});
