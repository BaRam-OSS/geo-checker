import { describe, it, expect } from 'vitest';
import { load } from 'cheerio';
import type { AuditContext } from '../../src/types.js';
import { robotsAiAllowRule } from '../../src/rules/crawler/robots-ai-allow.js';
import { parseRobots } from '../../src/fetcher/robots.js';

/**
 * 0.5.2: AI 크롤러는 robots.txt 에 이름이 없으면 기본으로 허용된다(RFC 9309).
 * 예전엔 "명시적으로 허용한 봇이 없다"는 이유로 0.6, robots.txt 가 없으면 0.5 를 줬다.
 * 실제 진단 185곳 중 162곳이 이 이유로 깎였고, 실제로 막은 곳은 5곳뿐이었다.
 * 이름을 적는 것은 크롤러 동작을 바꾸지 않으므로 감점 사유가 아니다.
 */
function ctx(robots: string | null): AuditContext {
  const html = '<html><body><p>본문</p></body></html>';
  return {
    url: 'https://example.com/',
    finalUrl: 'https://example.com/',
    html,
    $: load(html),
    headers: {},
    status: 200,
    robots: robots === null ? null : parseRobots(robots),
    llmsTxt: null,
    llmsFullTxt: null,
    sitemap: null,
    jsonLd: [],
    renderMode: 'static',
    fetchedAt: '2026-10-18T00:00:00.000Z',
    warnings: [],
  };
}

describe('crawler.robots-ai-allow', () => {
  it('robots.txt 가 없으면 모두 허용이라 통과', async () => {
    const r = await robotsAiAllowRule.run(ctx(null));
    expect(r.status).toBe('pass');
    expect(r.score).toBe(1);
  });

  it('와일드카드만 있고 AI 봇 이름이 없어도 통과', async () => {
    const r = await robotsAiAllowRule.run(ctx('User-agent: *\nDisallow: /admin\n'));
    expect(r.status).toBe('pass');
    expect(r.score).toBe(1);
  });

  it('명시적으로 허용해도 통과', async () => {
    const r = await robotsAiAllowRule.run(ctx('User-agent: GPTBot\nAllow: /\n'));
    expect(r.status).toBe('pass');
  });

  it('봇 하나를 막으면 fail, 막은 비율만큼 감점', async () => {
    const r = await robotsAiAllowRule.run(ctx('User-agent: GPTBot\nDisallow: /\n'));
    expect(r.status).toBe('fail');
    expect(r.score).toBeLessThan(1);
    expect(r.score).toBeGreaterThan(0.9);
  });

  it('와일드카드로 전부 막으면 0점', async () => {
    const r = await robotsAiAllowRule.run(ctx('User-agent: *\nDisallow: /\n'));
    expect(r.status).toBe('fail');
    expect(r.score).toBe(0);
  });
});
