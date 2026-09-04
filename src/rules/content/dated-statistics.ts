import { defineRule } from '../../types.js';

/**
 * 근거로 쓸 수 있는 수치가 본문에 있는지.
 *
 * 근거: Aggarwal et al. (KDD'24) 의 GEO 원 논문이 "Statistics Addition" 으로
 * position-adjusted word count 25.2% 점유(상대 +30.6%)를 보고했고,
 * arXiv 2607.14035 (Optimizing Visibility in Generative Engines, 2026) 서베이가
 * 이를 "extractable evidence" 로 재확인하면서 조건을 달았다 —
 * **"relevant, verifiable, dated, and properly attributed evidence"**.
 *
 * 그래서 숫자 개수를 세지 않는다. 같은 문장 안에 연도·기간 같은 시점이 붙은
 * 수치만 센다. 시점 없는 "30% 증가" 는 엔진이 언제 이야기인지 몰라 인용 근거로
 * 쓰기 어렵고, 서베이도 "adding a fabricated statistic may increase reuse while
 * degrading epistemic quality" 라고 경고한다.
 *
 * 같은 서베이가 순수 포맷 변경(heading·list 구조)은 "weak effects" 로 분류하고
 * "Test headings, tables, and fields without assuming the direction of effect"
 * 라고 적어 둔 것과 대비된다. 이 규칙이 구조 규칙보다 근거가 강하다.
 */

/** 숫자 + 단위/비율. 전화번호·주소·연도 단독은 제외한다. */
const NUMBER = /\d[\d,.]*\s*(%|퍼센트|배|억|만|천|원|달러|명|건|개|시간|분|초|일|주|개월|년|kg|g|km|m|㎡|평|위|점|배럴|톤)/g;

/** 같은 문장 안에서 시점을 나타내는 표현 */
const TIME_MARKER =
  /(19|20|21)\d{2}\s*년|(19|20|21)\d{2}\b|\d{1,2}\s*월|분기|상반기|하반기|올해|작년|전년|최근\s*\d|기준|현재/;

/** 출처를 밝히는 표현이 근처에 있는지 */
const ATTRIBUTION = /에 따르면|출처|자료:|조사|발표|보고서|according to|source:|report|survey|study/i;

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?。])\s+|(?<=[다요]\.)\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export const datedStatisticsRule = defineRule({
  id: 'cnt.dated-statistics',
  stableId: 'cnt.dated-statistics',
  category: 'content',
  group: 'opportunity',
  weight: 4,
  impact: 'high',
  effort: 'medium',
  docsUrl: 'https://github.com/BaRam-OSS/geo-checker/blob/main/docs/rules.md#cntdated-statistics',
  title: 'Body contains dated, attributable statistics',
  title_ko: '시점이 명시된 인용 가능한 수치 포함 여부',
  description:
    'Generative engines reuse statistics that are verifiable and dated. A number without a time reference is hard to cite; research reports statistics addition as one of the strongest content-side levers.',
  run(ctx) {
    const $ = ctx.$;
    const clone = $('body').clone();
    clone.find('script, style, noscript, nav, header, footer, aside').remove();
    const text = clone.text().replace(/[ \t]+/g, ' ').trim();

    if (!text) {
      return {
        status: 'skip',
        score: 0,
        rationale: 'No body text to analyse.',
        rationale_ko: '분석할 본문이 없습니다.',
      };
    }

    const sentences = splitSentences(text);
    const dated: string[] = [];
    const attributed: string[] = [];
    let bareNumbers = 0;

    for (const s of sentences) {
      NUMBER.lastIndex = 0;
      const hasNumber = NUMBER.test(s);
      if (!hasNumber) continue;
      if (TIME_MARKER.test(s)) {
        dated.push(s.slice(0, 160));
        if (ATTRIBUTION.test(s)) attributed.push(s.slice(0, 160));
      } else {
        bareNumbers++;
      }
    }

    const evidence = { dated: dated.slice(0, 3), attributed: attributed.length, bareNumbers };

    if (dated.length >= 3) {
      const note =
        attributed.length > 0
          ? ''
          : ' 다만 출처를 밝힌 문장은 없습니다 — "~에 따르면" 형태로 근거를 붙이면 인용 확률이 더 올라갑니다.';
      return {
        status: 'pass',
        score: attributed.length > 0 ? 1 : 0.8,
        rationale: `${dated.length} dated statistic(s) found${attributed.length > 0 ? `, ${attributed.length} with an explicit source` : ', none with an explicit source'}.`,
        rationale_ko: `시점이 명시된 수치가 ${dated.length}개 있습니다${attributed.length > 0 ? `, 그중 ${attributed.length}개는 출처도 밝혔습니다` : ''}.${note}`,
        evidence,
      };
    }

    if (dated.length >= 1) {
      return {
        status: 'warn',
        score: 0.5,
        rationale: `Only ${dated.length} dated statistic(s). Engines reuse numbers they can verify and date.`,
        rationale_ko: `시점이 명시된 수치가 ${dated.length}개뿐입니다. 엔진은 확인하고 시점을 알 수 있는 숫자를 재사용합니다.`,
        fixHint:
          '핵심 주장마다 "2026년 기준 32%" 처럼 시점을 붙인 수치를 넣고, 가능하면 "OO 조사에 따르면" 으로 출처를 밝히세요.',
        evidence,
        estimatedImpact: 2,
      };
    }

    const hint =
      bareNumbers > 0
        ? `숫자는 ${bareNumbers}개 있지만 언제 기준인지가 없습니다. "2026년", "1분기", "최근 3개월" 같은 시점을 같은 문장에 넣으세요.`
        : '핵심 주장을 뒷받침하는 수치를 넣으세요. 시점과 출처가 함께 있어야 인용 근거가 됩니다.';
    return {
      status: 'warn',
      score: 0,
      rationale: `No dated statistics found${bareNumbers > 0 ? ` (${bareNumbers} undated number(s))` : ''}.`,
      rationale_ko: `시점이 명시된 수치가 없습니다${bareNumbers > 0 ? ` (시점 없는 숫자 ${bareNumbers}개)` : ''}.`,
      fixHint: hint,
      evidence,
      estimatedImpact: 4,
    };
  },
});
