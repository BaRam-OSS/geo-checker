import { defineRule } from '../../types.js';

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
    const tokenEstimate = Math.round(text.length / 3);
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
