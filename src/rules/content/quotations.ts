import { defineRule } from '../../types.js';

/**
 * 인용문이 있는지.
 *
 * 근거: arXiv 2607.14035 서베이가 보고한 개별 레버 중 **가장 큰 효과 크기**다 —
 * "Quotation addition showed ~41% relative gain in position-adjusted word count
 * (27.2% vs. 19.3% baseline)". 원 논문(Aggarwal et al., KDD'24)의 Quotation
 * Addition 결과를 서베이가 재확인한 값이다.
 *
 * 조건이 있다. 서베이는 extractable evidence 의 요건을 "relevant, verifiable,
 * dated, and **properly attributed**" 로 못 박는다. 따옴표만 치고 누가 한 말인지
 * 없으면 엔진 입장에서 인용할 근거가 아니라 그냥 문장이다. 그래서 귀속 표현이
 * 붙었는지를 함께 본다.
 *
 * blockquote 태그와 따옴표 문장을 둘 다 센다 — 한국어 문서는 인용을 blockquote
 * 없이 따옴표로만 쓰는 경우가 많다.
 */

/** 큰따옴표(직선·곡선)로 감싼 12자 이상 구절 */
const QUOTED = /["“”]([^"“”]{12,300})["“”]/g;

/** 누가 한 말인지 밝히는 표현 */
const ATTRIBUTION =
  /(라고|이라고)\s*(말|밝히|설명|전하|덧붙이|강조)|에 따르면|의 말이다|씨는|대표는|교수는|연구진은|said|according to|told|explains?/i;

export const quotationsRule = defineRule({
  id: 'cnt.quotations',
  stableId: 'cnt.quotations',
  category: 'content',
  group: 'opportunity',
  weight: 3,
  impact: 'high',
  effort: 'medium',
  docsUrl: 'https://github.com/BaRam-OSS/geo-checker/blob/main/docs/rules.md#cntquotations',
  title: 'Body contains attributed quotations',
  title_ko: '출처가 밝혀진 인용문 포함 여부',
  description:
    'Quotation addition is the single largest content-side lever reported in GEO research (~41% relative gain), but only when the quote is attributed to a named source.',
  run(ctx) {
    const $ = ctx.$;
    const clone = $('body').clone();
    clone.find('script, style, noscript, nav, header, footer, aside').remove();

    const blockquotes = clone.find('blockquote').length;
    const text = clone.text().replace(/[ \t]+/g, ' ').trim();

    if (!text) {
      return {
        status: 'skip',
        score: 0,
        rationale: 'No body text to analyse.',
        rationale_ko: '분석할 본문이 없습니다.',
      };
    }

    const quoted: string[] = [];
    let m: RegExpExecArray | null;
    QUOTED.lastIndex = 0;
    while ((m = QUOTED.exec(text)) !== null) {
      if (m[1]) quoted.push(m[1]);
    }

    const total = blockquotes + quoted.length;
    // 귀속 표현은 인용 구절 자체가 아니라 그 주변 문장에 온다
    const attributed = quoted.filter((q) => {
      const i = text.indexOf(q);
      const around = text.slice(Math.max(0, i - 120), Math.min(text.length, i + q.length + 120));
      return ATTRIBUTION.test(around);
    }).length;

    const evidence = { blockquotes, quotedPhrases: quoted.length, attributed, samples: quoted.slice(0, 2) };

    if (total === 0) {
      return {
        status: 'warn',
        score: 0,
        rationale: 'No quotations found. Quotation addition is the largest reported content-side lever for citation.',
        rationale_ko:
          '인용문이 없습니다. 연구에서 보고된 콘텐츠 쪽 개선 수단 중 인용문 추가의 효과가 가장 컸습니다.',
        fixHint:
          '전문가·기관·이용자의 말을 직접 인용하고 누가 한 말인지 밝히세요. "OO 연구소 김OO 연구원은 \\"...\\"라고 설명했습니다" 형태면 됩니다.',
        evidence,
        estimatedImpact: 3,
      };
    }

    if (attributed === 0 && blockquotes === 0) {
      return {
        status: 'warn',
        score: 0.4,
        rationale: `${quoted.length} quoted phrase(s) but none attributed to a named source.`,
        rationale_ko: `따옴표로 감싼 구절이 ${quoted.length}개 있지만 누가 한 말인지 밝힌 것이 없습니다.`,
        fixHint:
          '인용 앞뒤에 발화자를 넣으세요. 귀속이 없으면 엔진 입장에서는 인용 근거가 아니라 그냥 문장입니다.',
        evidence,
        estimatedImpact: 2,
      };
    }

    return {
      status: 'pass',
      score: attributed > 0 || blockquotes > 0 ? 1 : 0.7,
      rationale: `${total} quotation(s) found${attributed > 0 ? `, ${attributed} attributed` : ''}.`,
      rationale_ko: `인용문이 ${total}개 있습니다${attributed > 0 ? `, 그중 ${attributed}개는 출처가 밝혀져 있습니다` : ''}.`,
      evidence,
    };
  },
});
