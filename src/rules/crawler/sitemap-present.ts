import { defineRule } from '../../types.js';

export const sitemapPresentRule = defineRule({
  id: 'crawler.sitemap-present',
  stableId: 'crawler.sitemap-present',
  category: 'crawler',
  group: 'diagnostic',
  weight: 4,
  impact: 'high',
  effort: 'low',
  docsUrl: 'https://github.com/BaRam-OSS/geo-checker/blob/main/docs/rules.md#crawlersitemap-present',
  title: 'sitemap.xml is present',
  description: 'A sitemap helps AI crawlers discover and prioritise pages; many crawlers short-circuit discovery without one.',
  run(ctx) {
    if (ctx.sitemap && ctx.sitemap.urls.length > 0) {
      return {
        status: 'pass',
        score: 1,
        rationale: `Sitemap found with ${ctx.sitemap.urls.length} URL(s).`,
      };
    }
    return {
      status: 'warn',
      score: 0.2,
      rationale: 'No sitemap.xml found (checked /sitemap.xml and Sitemap: directive in robots.txt).',
      fixUrl: 'https://github.com/BaRam-OSS/geo-checker/blob/main/docs/rules.md',
    };
  },
});
