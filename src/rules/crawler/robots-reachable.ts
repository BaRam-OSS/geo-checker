import { defineRule } from '../../types.js';

export const robotsReachableRule = defineRule({
  id: 'crawler.robots-reachable',
  stableId: 'crawler.robots-reachable',
  category: 'crawler',
  group: 'diagnostic',
  weight: 2,
  impact: 'low',
  effort: 'low',
  docsUrl: 'https://github.com/BaRam-OSS/geo-checker/blob/main/docs/rules.md#crawlerrobots-reachable',
  title: 'robots.txt is reachable',
  title_ko: 'robots.txt 접근 가능 여부',
  description: 'A reachable robots.txt lets crawlers confirm their permissions; missing file is treated as allow-all but blocks explicit signalling.',
  run(ctx) {
    if (ctx.robots) {
      return { status: 'pass', score: 1, rationale: 'robots.txt returned successfully.', rationale_ko: 'robots.txt가 정상적으로 응답합니다.' };
    }
    return {
      status: 'warn',
      score: 0.3,
      rationale: 'robots.txt is missing. Add one even if empty to explicitly signal crawl policy.',
      rationale_ko: 'robots.txt가 없습니다. 크롤 정책을 명시적으로 알리려면 비어 있더라도 추가하세요.',
      fixUrl: 'https://github.com/BaRam-OSS/geo-checker/blob/main/docs/rules.md',
    };
  },
});
