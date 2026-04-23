import { defineRule } from '../../types.js';

export const httpsRule = defineRule({
  id: 'crawler.https',
  category: 'crawler',
  weight: 2,
  title: 'Site is served over HTTPS',
  description: 'AI crawlers treat HTTPS pages as more trustworthy and some skip plain HTTP entirely.',
  run(ctx) {
    const isHttps = ctx.finalUrl.startsWith('https://');
    return isHttps
      ? { status: 'pass', score: 1, rationale: 'Final URL uses HTTPS.' }
      : {
          status: 'fail',
          score: 0,
          rationale: 'Final URL does not use HTTPS. Redirect HTTP → HTTPS site-wide.',
          fixUrl: 'https://github.com/BaRam-OSS/geo-checker/blob/main/docs/rules/crawler.https.md',
        };
  },
});
