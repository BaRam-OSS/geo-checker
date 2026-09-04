import { describe, it, expect } from 'vitest';
import { load } from 'cheerio';
import type { AuditContext } from '../../src/types.js';
import { metaRobotsRule } from '../../src/rules/crawler/meta-robots.js';
import { xRobotsTagRule } from '../../src/rules/crawler/x-robots-tag.js';
import { httpStatusRule } from '../../src/rules/crawler/http-status.js';

/**
 * 0.4.0 신설 규칙 — 다른 모든 검사의 전제 조건.
 *
 * 이 셋이 없어서 `<meta name="robots" content="noindex">` 인 페이지가 95점을
 * 받을 수 있었고, 403 봇차단 페이지의 HTML 이 실제 사이트인 양 채점됐다.
 */
function ctx(overrides: Partial<AuditContext> = {}): AuditContext {
  const html = overrides.html ?? '<html><body><p>본문</p></body></html>';
  const $ = load(html);
  return {
    url: 'https://example.com/',
    finalUrl: 'https://example.com/',
    html,
    $,
    headers: {},
    status: 200,
    robots: null,
    llmsTxt: null,
    llmsFullTxt: null,
    sitemap: null,
    jsonLd: [],
    renderMode: 'static',
    fetchedAt: '2026-09-04T00:00:00.000Z',
    warnings: [],
    ...overrides,
    ...(overrides.html ? { $: load(overrides.html) } : {}),
  };
}

describe('crawler.meta-robots', () => {
  it('태그가 없으면 통과', async () => {
    const r = await metaRobotsRule.run(ctx());
    expect(r.status).toBe('pass');
  });

  it('noindex 는 fail', async () => {
    const r = await metaRobotsRule.run(
      ctx({ html: '<html><head><meta name="robots" content="noindex, follow"></head><body></body></html>' }),
    );
    expect(r.status).toBe('fail');
    expect(r.score).toBe(0);
    expect(r.rationale_ko).toContain('noindex');
  });

  it('봇별 지시어(googlebot)도 잡는다', async () => {
    const r = await metaRobotsRule.run(
      ctx({ html: '<html><head><meta name="googlebot" content="noindex"></head><body></body></html>' }),
    );
    expect(r.status).toBe('fail');
  });

  it('noai 는 AI 거부로 경고', async () => {
    const r = await metaRobotsRule.run(
      ctx({ html: '<html><head><meta name="robots" content="index, noai"></head><body></body></html>' }),
    );
    expect(r.status).toBe('warn');
    expect(r.rationale_ko).toContain('noai');
  });

  it('nosnippet 은 인용 불가로 경고', async () => {
    const r = await metaRobotsRule.run(
      ctx({ html: '<html><head><meta name="robots" content="index, nosnippet"></head><body></body></html>' }),
    );
    expect(r.status).toBe('warn');
  });

  it('index, follow 는 통과', async () => {
    const r = await metaRobotsRule.run(
      ctx({ html: '<html><head><meta name="robots" content="index, follow"></head><body></body></html>' }),
    );
    expect(r.status).toBe('pass');
  });
});

describe('crawler.x-robots-tag', () => {
  it('헤더가 없으면 통과', async () => {
    const r = await xRobotsTagRule.run(ctx());
    expect(r.status).toBe('pass');
  });

  it('noindex 헤더는 fail', async () => {
    const r = await xRobotsTagRule.run(ctx({ headers: { 'x-robots-tag': 'noindex' } }));
    expect(r.status).toBe('fail');
  });

  it('헤더 이름 대소문자를 가리지 않는다', async () => {
    const r = await xRobotsTagRule.run(ctx({ headers: { 'X-Robots-Tag': 'NOINDEX' } }));
    expect(r.status).toBe('fail');
  });

  it('noai 는 경고', async () => {
    const r = await xRobotsTagRule.run(ctx({ headers: { 'x-robots-tag': 'noai' } }));
    expect(r.status).toBe('warn');
  });

  it('허용 지시어는 통과', async () => {
    const r = await xRobotsTagRule.run(ctx({ headers: { 'x-robots-tag': 'max-snippet:-1' } }));
    expect(r.status).toBe('pass');
  });
});

describe('crawler.http-status', () => {
  it('200 + 실제 본문이면 통과', async () => {
    const r = await httpStatusRule.run(ctx());
    expect(r.status).toBe('pass');
  });

  it('403 은 fail — AI 크롤러도 같은 벽에 막힌다', async () => {
    const r = await httpStatusRule.run(ctx({ status: 403 }));
    expect(r.status).toBe('fail');
    expect(r.fixHint).toContain('GPTBot');
  });

  it('429 도 fail', async () => {
    const r = await httpStatusRule.run(ctx({ status: 429 }));
    expect(r.status).toBe('fail');
  });

  it('404 는 fail', async () => {
    const r = await httpStatusRule.run(ctx({ status: 404 }));
    expect(r.status).toBe('fail');
  });

  it('5xx 는 fail', async () => {
    const r = await httpStatusRule.run(ctx({ status: 503 }));
    expect(r.status).toBe('fail');
  });

  it('200 이어도 봇 차단 페이지면 경고', async () => {
    const r = await httpStatusRule.run(
      ctx({ html: '<html><body><h1>Just a moment...</h1><p>Checking your browser</p></body></html>' }),
    );
    expect(r.status).toBe('warn');
    expect(r.rationale_ko).toContain('봇 차단');
  });

  it('한국어 차단 문구도 잡는다', async () => {
    const r = await httpStatusRule.run(
      ctx({ html: '<html><body><p>비정상적인 접근이 감지되었습니다</p></body></html>' }),
    );
    expect(r.status).toBe('warn');
  });
});
