import { defineRule } from '../../types.js';

/**
 * 응답 상태코드를 아무도 확인하지 않았다. 403 봇차단 페이지나 소프트 404 가 와도
 * 그 오류 페이지의 HTML 을 그대로 채점했다 — 실제 사이트와 무관한 점수가 나온다.
 *
 * 403/429 는 특히 중요한 신호다. 우리가 막혔다면 AI 크롤러도 같은 벽에 막힌다.
 */

/** 봇 차단 페이지에서 흔히 보이는 문구 */
const BOT_WALL_MARKERS = [
  'cloudflare',
  'just a moment',
  'checking your browser',
  'attention required',
  'access denied',
  'ddos protection',
  '접근이 차단',
  '비정상적인 접근',
];

export const httpStatusRule = defineRule({
  id: 'crawler.http-status',
  stableId: 'crawler.http-status',
  category: 'crawler',
  group: 'diagnostic',
  weight: 5,
  impact: 'critical',
  effort: 'medium',
  docsUrl: 'https://github.com/BaRam-OSS/geo-checker/blob/main/docs/rules.md#crawlerhttp-status',
  title: 'Page returns a successful status and real content',
  title_ko: '페이지가 정상 응답과 실제 콘텐츠를 반환함',
  description:
    'Everything else is scored against whatever HTML came back. If that HTML is an error page or a bot wall, the score is meaningless.',
  run(ctx) {
    const status = ctx.status;
    const html = (ctx.html || '').toLowerCase();
    const hit = BOT_WALL_MARKERS.find((m) => html.includes(m));

    if (status === 403 || status === 401 || status === 429) {
      return {
        status: 'fail',
        score: 0,
        rationale: `Server returned ${status}. AI crawlers hit the same wall, and every other check below was run against this error page.`,
        rationale_ko: `서버가 ${status} 를 반환했습니다. AI 크롤러도 같은 벽에 막히며, 아래 다른 검사들은 이 오류 페이지를 대상으로 돌았습니다.`,
        fixHint:
          'WAF·봇 차단 설정에서 GPTBot·ClaudeBot·PerplexityBot·Google-Extended 를 허용 목록에 넣으세요. Cloudflare 라면 Bot Fight Mode 를 확인하세요.',
        evidence: { status },
      };
    }

    if (status >= 500) {
      return {
        status: 'fail',
        score: 0,
        rationale: `Server returned ${status}. The page could not be evaluated.`,
        rationale_ko: `서버가 ${status} 를 반환해 페이지를 평가할 수 없습니다.`,
        evidence: { status },
      };
    }

    if (status === 404 || status === 410) {
      return {
        status: 'fail',
        score: 0,
        rationale: `Server returned ${status}; this URL does not exist.`,
        rationale_ko: `서버가 ${status} 를 반환했습니다. 이 URL 은 존재하지 않습니다.`,
        evidence: { status },
      };
    }

    if (status !== 200) {
      return {
        status: 'warn',
        score: 0.5,
        rationale: `Unexpected status ${status}.`,
        rationale_ko: `예상하지 못한 상태코드 ${status} 입니다.`,
        evidence: { status },
      };
    }

    // 200 이어도 봇 차단 페이지를 200 으로 내려주는 사이트가 있다
    if (hit) {
      return {
        status: 'warn',
        score: 0.3,
        rationale: `Status is 200 but the HTML looks like a bot challenge page ("${hit}"). Scores below may not reflect the real site.`,
        rationale_ko: `200 이지만 본문이 봇 차단 페이지로 보입니다 ("${hit}"). 아래 점수가 실제 사이트를 반영하지 않을 수 있습니다.`,
        fixHint: 'AI 크롤러 UA 를 봇 차단 예외로 등록하세요.',
        evidence: { status, marker: hit },
      };
    }

    return {
      status: 'pass',
      score: 1,
      rationale: 'Page returned 200 with real content.',
      rationale_ko: '페이지가 200 과 실제 콘텐츠를 반환했습니다.',
    };
  },
});
