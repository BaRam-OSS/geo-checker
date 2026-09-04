import { defineRule } from '../../types.js';

/**
 * 토큰 수 추정. 스크립트별로 문자당 토큰이 크게 달라 한 가지 계수로는 안 된다.
 *
 * 예전엔 `text.length / 3` 하나로 계산했는데, 한국어에서 심하게 빗나간다.
 * 현대 BPE 토크나이저에서 한글은 대략 문자당 1~1.5 토큰이고 영문은 4~5 문자당
 * 1 토큰이라, 한국어 문서의 토큰 수가 3~4배까지 과소평가됐다. 그 결과 실제로는
 * 15K 를 훌쩍 넘는 한국어 페이지가 "권장 범위 이내" 로 통과했다.
 *
 * 정확한 값은 토크나이저를 돌려야 나오지만, 이 규칙의 목적은 "잘릴 만큼 긴가"를
 * 가르는 것이므로 스크립트별 근사로 충분하다.
 */
export function estimateTokens(text: string): number {
  let cjk = 0;
  let other = 0;
  for (const ch of text) {
    const c = ch.codePointAt(0)!;
    // 한글(음절·자모), CJK 통합한자, 가나
    const isCjk =
      (c >= 0xac00 && c <= 0xd7a3) ||
      (c >= 0x1100 && c <= 0x11ff) ||
      (c >= 0x3130 && c <= 0x318f) ||
      (c >= 0x4e00 && c <= 0x9fff) ||
      (c >= 0x3040 && c <= 0x30ff);
    if (isCjk) cjk++;
    else other++;
  }
  // 한글 1.2 토큰/자, 그 외 0.25 토큰/자(≈4자당 1토큰)
  return Math.round(cjk * 1.2 + other * 0.25);
}

const THRESHOLD_OPTIMAL = 15_000;
const THRESHOLD_MAX = 25_000;

export const aeoTokenLengthRule = defineRule({
  id: 'aeo.token-length',
  stableId: 'aeo.token-length',
  category: 'aeo',
  group: 'diagnostic',
  weight: 4,
  impact: 'medium',
  effort: 'medium',
  docsUrl: 'https://github.com/BaRam-OSS/geo-checker/blob/main/docs/rules.md#aeotoken-length',
  title: 'Content token length within AI agent limits',
  title_ko: '콘텐츠 토큰 수 AI 에이전트 권장 범위',
  description: 'Pages under 15K tokens are optimal for AI agents (per Addy Osmani\'s AEO guidance).',
  run(ctx) {
    const text = ctx.$('body').text();
    const tokenEstimate = estimateTokens(text);
    const evidence = { tokenEstimate, thresholds: { optimal: THRESHOLD_OPTIMAL, max: THRESHOLD_MAX } };

    if (tokenEstimate <= THRESHOLD_OPTIMAL) {
      return {
        status: 'pass',
        score: 1,
        rationale: `Estimated ~${tokenEstimate.toLocaleString()} tokens — within optimal range.`,
        rationale_ko: `예상 토큰 수 ~${tokenEstimate.toLocaleString()} — 권장 범위(15K) 이내입니다.`,
        evidence,
      };
    }
    if (tokenEstimate <= THRESHOLD_MAX) {
      return {
        status: 'warn',
        score: 0.5,
        rationale: `Estimated ~${tokenEstimate.toLocaleString()} tokens — exceeds 15K recommendation.`,
        rationale_ko: `예상 토큰 수 ~${tokenEstimate.toLocaleString()} — 15K 권장치를 초과합니다.`,
        fixHint: 'Consider splitting content into shorter, focused pages.',
        evidence,
      };
    }
    return {
      status: 'fail',
      score: 0,
      rationale: `Estimated ~${tokenEstimate.toLocaleString()} tokens — exceeds 25K agent processing limit.`,
      rationale_ko: `예상 토큰 수 ~${tokenEstimate.toLocaleString()} — AI 에이전트 처리 한계(25K)를 초과합니다.`,
      fixHint: 'Split this page into multiple focused pages under 15K tokens.',
      evidence,
    };
  },
});
