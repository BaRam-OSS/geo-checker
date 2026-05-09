import { defineRule } from '../../types.js';

export const httpsRule = defineRule({
  id: 'crawler.https',
  stableId: 'crawler.https',
  category: 'crawler',
  group: 'diagnostic',
  weight: 2,
  impact: 'critical',
  effort: 'medium',
  docsUrl: 'https://github.com/BaRam-OSS/geo-checker/blob/main/docs/rules.md#crawlerhttps',
  title: 'Site is served over HTTPS',
  title_ko: '사이트가 HTTPS로 제공됨',
  description: 'AI crawlers treat HTTPS pages as more trustworthy and some skip plain HTTP entirely.',
  run(ctx) {
    const isHttps = ctx.finalUrl.startsWith('https://');
    return isHttps
      ? { status: 'pass', score: 1, rationale: 'Final URL uses HTTPS.', rationale_ko: '최종 URL이 HTTPS를 사용합니다.' }
      : {
          status: 'fail',
          score: 0,
          rationale: 'Final URL does not use HTTPS. Redirect HTTP → HTTPS site-wide.',
          rationale_ko: '최종 URL이 HTTPS를 사용하지 않습니다. 사이트 전체를 HTTP → HTTPS로 리다이렉트하세요.',
          fixUrl: 'https://github.com/BaRam-OSS/geo-checker/blob/main/docs/rules.md',
        };
  },
});
