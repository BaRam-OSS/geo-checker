import { describe, it, expect } from 'vitest';
import { load } from 'cheerio';
import type { AuditContext } from '../../src/types.js';
import { datedStatisticsRule } from '../../src/rules/content/dated-statistics.js';
import { quotationsRule } from '../../src/rules/content/quotations.js';
import { estimateTokens } from '../../src/rules/aeo/token-length.js';

/**
 * 0.5.0 — 인용 가능한 근거 규칙.
 *
 * content 카테고리가 전부 구조 검사(H1 개수·제목 순서·alt)뿐이었는데,
 * GEO 서베이(arXiv 2607.14035)는 순수 포맷 변경을 "weak effects" 로 분류하고
 * 시점 있는 수치와 귀속된 인용문을 가장 강한 레버로 보고한다.
 */
function ctx(bodyHtml: string): AuditContext {
  const html = `<html><body>${bodyHtml}</body></html>`;
  return {
    url: 'https://example.com/',
    finalUrl: 'https://example.com/',
    html,
    $: load(html),
    headers: {},
    status: 200,
    robots: null,
    llmsTxt: null,
    llmsFullTxt: null,
    sitemap: null,
    jsonLd: [],
    renderMode: 'static',
    fetchedAt: '2026-09-05T00:00:00.000Z',
    warnings: [],
  };
}

describe('cnt.dated-statistics', () => {
  it('시점이 붙은 수치가 3개 이상이면 통과', async () => {
    const r = await datedStatisticsRule.run(
      ctx(`
        <p>2026년 기준 전환율이 32% 올랐습니다.</p>
        <p>1분기 매출은 15억 원이었습니다.</p>
        <p>최근 3개월 동안 문의가 240건 늘었습니다.</p>
      `),
    );
    expect(r.status).toBe('pass');
  });

  it('출처까지 밝히면 만점', async () => {
    const r = await datedStatisticsRule.run(
      ctx(`
        <p>통계청 조사에 따르면 2026년 기준 32%가 해당됩니다.</p>
        <p>같은 보고서에서 1분기 거래액은 15억 원으로 나타났습니다.</p>
        <p>2026년 상반기 문의는 240건이었습니다.</p>
      `),
    );
    expect(r.status).toBe('pass');
    expect(r.score).toBe(1);
  });

  it('출처 없이 시점만 있으면 통과하되 감점', async () => {
    const r = await datedStatisticsRule.run(
      ctx(`
        <p>2026년 기준 32% 입니다.</p>
        <p>1분기에 15억 원이었습니다.</p>
        <p>올해 240건이 늘었습니다.</p>
      `),
    );
    expect(r.status).toBe('pass');
    expect(r.score).toBeLessThan(1);
    expect(r.rationale_ko).toContain('출처');
  });

  // 핵심 판정: 숫자 개수를 세는 게 아니라 "언제 기준인지"를 본다.
  it('시점 없는 숫자만 있으면 경고하고 그 사실을 알려준다', async () => {
    const r = await datedStatisticsRule.run(
      ctx(`
        <p>전환율이 32% 올랐습니다.</p>
        <p>매출은 15억 원입니다.</p>
        <p>문의가 240건 늘었습니다.</p>
      `),
    );
    expect(r.status).toBe('warn');
    expect(r.score).toBe(0);
    expect(r.fixHint).toContain('언제 기준인지');
    expect((r.evidence as { bareNumbers: number }).bareNumbers).toBeGreaterThan(0);
  });

  it('수치가 아예 없으면 경고', async () => {
    const r = await datedStatisticsRule.run(ctx('<p>숫자가 하나도 없는 문단입니다.</p>'));
    expect(r.status).toBe('warn');
    expect(r.estimatedImpact).toBe(4);
  });
});

describe('cnt.quotations', () => {
  it('귀속된 인용문이 있으면 통과', async () => {
    const r = await quotationsRule.run(
      ctx('<p>김OO 연구원은 "시점이 없는 수치는 재사용되지 않는다"라고 설명했습니다.</p>'),
    );
    expect(r.status).toBe('pass');
    expect(r.score).toBe(1);
  });

  it('blockquote 도 인용으로 센다', async () => {
    const r = await quotationsRule.run(ctx('<blockquote>관련성과 위치가 지배적이다.</blockquote>'));
    expect(r.status).toBe('pass');
  });

  // 서베이는 extractable evidence 의 요건에 "properly attributed" 를 못 박는다.
  it('따옴표만 있고 누가 한 말인지 없으면 경고', async () => {
    const r = await quotationsRule.run(
      ctx('<p>어떤 문서에는 "구조만 바꾸는 것으로는 효과가 약하다" 같은 문장이 있습니다.</p>'),
    );
    expect(r.status).toBe('warn');
    expect(r.rationale_ko).toContain('누가 한 말인지');
  });

  it('인용이 하나도 없으면 경고', async () => {
    const r = await quotationsRule.run(ctx('<p>인용이 전혀 없는 평범한 문단입니다.</p>'));
    expect(r.status).toBe('warn');
    expect(r.estimatedImpact).toBe(3);
  });
});

describe('estimateTokens', () => {
  // 예전엔 length/3 하나여서 한국어 토큰 수가 3~4배 과소평가됐다.
  it('한글은 문자당 토큰이 영문보다 훨씬 크다', () => {
    const ko = estimateTokens('가'.repeat(1000));
    const en = estimateTokens('a'.repeat(1000));
    expect(ko).toBeGreaterThan(en * 4);
  });

  it('영문은 대략 4자당 1토큰', () => {
    expect(estimateTokens('a'.repeat(1000))).toBe(250);
  });

  it('한글은 대략 1자당 1.2토큰', () => {
    expect(estimateTokens('가'.repeat(1000))).toBe(1200);
  });

  it('섞인 문서는 각각 계산해 합친다', () => {
    expect(estimateTokens('가'.repeat(100) + 'a'.repeat(100))).toBe(120 + 25);
  });
});
