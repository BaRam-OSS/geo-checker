import { defineRule } from '../../types.js';

/**
 * `X-Robots-Tag` 는 HTTP 헤더로 내려오는 색인 지시어다. HTML 을 아무리 봐도 안 보이고,
 * robots.txt 와도 별개로 동작한다. CDN·WAF·프레임워크 기본값으로 붙는 경우가 많아
 * 사이트 주인이 모르는 채 색인이 막혀 있는 일이 흔하다.
 *
 * geo-checker 는 `ctx.headers` 를 수집해 놓고도 **읽는 규칙이 하나도 없었다.**
 */
const AI_OPT_OUT = ['noai', 'noimageai'];

export const xRobotsTagRule = defineRule({
  id: 'crawler.x-robots-tag',
  stableId: 'crawler.x-robots-tag',
  category: 'crawler',
  group: 'diagnostic',
  weight: 4,
  impact: 'critical',
  effort: 'medium',
  docsUrl: 'https://github.com/BaRam-OSS/geo-checker/blob/main/docs/rules.md#crawlerx-robots-tag',
  title: 'X-Robots-Tag header does not block indexing or AI',
  title_ko: 'X-Robots-Tag 헤더가 색인·AI를 막지 않음',
  description:
    'The X-Robots-Tag response header carries the same directives as the robots meta tag but is invisible in the HTML.',
  run(ctx) {
    // 헤더 이름은 대소문자를 가리지 않는다
    const key = Object.keys(ctx.headers || {}).find((k) => k.toLowerCase() === 'x-robots-tag');
    const raw = key ? String(ctx.headers[key] || '') : '';

    if (!raw) {
      return {
        status: 'pass',
        score: 1,
        rationale: 'No X-Robots-Tag header.',
        rationale_ko: 'X-Robots-Tag 헤더가 없습니다.',
      };
    }

    const value = raw.toLowerCase();

    if (/\bnoindex\b/.test(value)) {
      return {
        status: 'fail',
        score: 0,
        rationale: `X-Robots-Tag declares noindex (${raw}). This overrides everything in robots.txt and the page will not be indexed.`,
        rationale_ko: `X-Robots-Tag 가 noindex 입니다 (${raw}). robots.txt 설정과 무관하게 이 페이지는 색인되지 않습니다.`,
        fixHint:
          '서버·CDN 설정에서 X-Robots-Tag 를 지우세요. Vercel·Netlify·Nginx 기본 설정이나 스테이징용 헤더가 그대로 남아 있는 경우가 많습니다.',
        evidence: { header: raw },
      };
    }

    const optOuts = AI_OPT_OUT.filter((t) => new RegExp(`\\b${t}\\b`).test(value));
    if (optOuts.length > 0) {
      return {
        status: 'warn',
        score: 0.3,
        rationale: `X-Robots-Tag opts out of AI use (${raw}).`,
        rationale_ko: `X-Robots-Tag 로 AI 활용을 거부하고 있습니다 (${raw}). 의도한 설정이 아니라면 제거하세요.`,
        fixHint: 'AI 검색 노출을 원하면 헤더에서 noai / noimageai 를 빼세요.',
        evidence: { header: raw },
      };
    }

    if (/\bnosnippet\b/.test(value)) {
      return {
        status: 'warn',
        score: 0.5,
        rationale: `X-Robots-Tag sets nosnippet (${raw}); answer engines cannot quote this page.`,
        rationale_ko: `X-Robots-Tag 에 nosnippet 이 있어 (${raw}) 답변 엔진이 본문을 인용할 수 없습니다.`,
        fixHint: '인용되길 원한다면 nosnippet 대신 max-snippet:-1 을 쓰세요.',
        evidence: { header: raw },
      };
    }

    return {
      status: 'pass',
      score: 1,
      rationale: `X-Robots-Tag present but permissive (${raw}).`,
      rationale_ko: `X-Robots-Tag 가 색인을 막지 않습니다 (${raw}).`,
    };
  },
});
