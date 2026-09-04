import { defineRule } from '../../types.js';

/**
 * robots.txt 를 아무리 잘 열어 둬도 페이지 자체가 `<meta name="robots" content="noindex">`
 * 면 색인되지 않는다. 그런데 이 검사가 없어서 **noindex 페이지가 95점을 받을 수 있었다.**
 *
 * `noai` / `noimageai` 는 여러 AI 크롤러가 존중하는 관례적 지시어다. 표준은 아니지만
 * 붙어 있으면 의도적으로 AI 를 막은 것이므로 그대로 알려 준다.
 */
const AI_OPT_OUT = ['noai', 'noimageai'];

export const metaRobotsRule = defineRule({
  id: 'crawler.meta-robots',
  stableId: 'crawler.meta-robots',
  category: 'crawler',
  group: 'diagnostic',
  weight: 5,
  impact: 'critical',
  effort: 'low',
  docsUrl: 'https://github.com/BaRam-OSS/geo-checker/blob/main/docs/rules.md#crawlermeta-robots',
  title: 'Page-level robots meta does not block indexing or AI',
  title_ko: 'meta robots 태그가 색인·AI를 막지 않음',
  description:
    'A page-level robots meta tag overrides robots.txt. noindex removes the page from search entirely, and noai/noimageai opt out of AI use.',
  run(ctx) {
    const $ = ctx.$;
    const contents: string[] = [];
    $('meta[name]').each((_: unknown, el: unknown) => {
      const name = String($(el as never).attr('name') || '').toLowerCase();
      // googlebot / bingbot 등 봇별 지시어도 같은 의미를 가진다
      if (name === 'robots' || name.endsWith('bot')) {
        const content = String($(el as never).attr('content') || '').toLowerCase();
        if (content) contents.push(content);
      }
    });

    if (contents.length === 0) {
      return {
        status: 'pass',
        score: 1,
        rationale: 'No robots meta tag; indexing is allowed by default.',
        rationale_ko: 'robots meta 태그가 없어 기본값(색인 허용)이 적용됩니다.',
      };
    }

    const joined = contents.join(', ');
    const hasNoindex = contents.some((c) => /\bnoindex\b/.test(c));
    const optOuts = AI_OPT_OUT.filter((t) => contents.some((c) => new RegExp(`\\b${t}\\b`).test(c)));

    if (hasNoindex) {
      return {
        status: 'fail',
        score: 0,
        rationale: `Page declares noindex (${joined}). Search engines and AI answer engines will drop this page entirely.`,
        rationale_ko: `페이지가 noindex 를 선언했습니다 (${joined}). 검색엔진과 AI 답변 엔진 모두 이 페이지를 통째로 제외합니다.`,
        fixHint:
          '색인을 원한다면 <meta name="robots" content="noindex"> 를 지우세요. 스테이징 설정이 그대로 배포된 경우가 흔합니다.',
        evidence: { content: joined },
      };
    }

    if (optOuts.length > 0) {
      return {
        status: 'warn',
        score: 0.3,
        rationale: `Page opts out of AI use via ${optOuts.join(', ')}.`,
        rationale_ko: `${optOuts.join(', ')} 로 AI 활용을 거부하고 있습니다. 의도한 설정이 아니라면 제거하세요.`,
        fixHint: 'AI 검색에 노출되고 싶다면 robots meta 에서 noai / noimageai 를 빼세요.',
        evidence: { content: joined },
      };
    }

    const hasNosnippet = contents.some((c) => /\bnosnippet\b/.test(c));
    if (hasNosnippet) {
      return {
        status: 'warn',
        score: 0.5,
        rationale: `Page sets nosnippet (${joined}); answer engines cannot quote it.`,
        rationale_ko: `nosnippet 이 설정돼 있어 (${joined}) 답변 엔진이 본문을 인용할 수 없습니다.`,
        fixHint: '인용되길 원한다면 nosnippet 을 빼고 max-snippet:-1 을 쓰세요.',
        evidence: { content: joined },
      };
    }

    return {
      status: 'pass',
      score: 1,
      rationale: `Robots meta present and permissive (${joined}).`,
      rationale_ko: `robots meta 가 색인을 막지 않습니다 (${joined}).`,
    };
  },
});
