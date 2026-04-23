import { describe, it, expect } from 'vitest';
import { load } from 'cheerio';
import type { AuditContext } from '../src/types.js';
import { runRules } from '../src/engine.js';
import { defaultRules } from '../src/rules/index.js';
import { parseRobots } from '../src/fetcher/robots.js';
import { parseLlmsTxt } from '../src/fetcher/llms-txt.js';

function makeCtx(overrides: Partial<AuditContext> = {}): AuditContext {
  const html =
    overrides.html ??
    `<!doctype html><html lang="en"><head><title>Hi</title></head><body><h1>Hi</h1><p>body</p></body></html>`;
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
    fetchedAt: '2026-04-23T00:00:00.000Z',
    warnings: [],
    ...overrides,
  };
}

describe('full rule registry', () => {
  it('scores a rich page highly', async () => {
    const recentIso = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const html = `<!doctype html>
<html lang="en">
<head>
  <title>A deep dive into GEO for 2026</title>
  <meta name="description" content="${'x'.repeat(100)}">
  <link rel="canonical" href="https://example.com/post">
  <meta property="og:title" content="t">
  <meta property="og:type" content="article">
  <meta property="og:url" content="https://example.com/post">
  <meta property="og:image" content="https://example.com/cover.png">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="t">
  <meta property="article:published_time" content="${recentIso}">
  <script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'A deep dive into GEO for 2026',
    author: { '@type': 'Person', name: 'Alice' },
    datePublished: recentIso,
    dateModified: recentIso,
    publisher: {
      '@type': 'Organization',
      name: 'Example Co',
      sameAs: [
        'https://en.wikipedia.org/wiki/Example',
        'https://www.linkedin.com/company/example',
      ],
    },
  })}</script>
</head>
<body>
  <h1>A deep dive into GEO for 2026</h1>
  <h2>What is GEO?</h2>
  <h2>How do AI engines rank pages?</h2>
  <section id="tldr"><p>TL;DR: make your site citation-ready.</p></section>
  <img src="a.png" alt="diagram"><img src="b.png" alt="diagram"><img src="c.png" alt="">
  <p>See the <a href="https://en.wikipedia.org/wiki/Generative_AI">Wikipedia entry</a>, the <a href="https://schema.org/Article">schema.org spec</a>, and the <a href="https://platform.openai.com/docs">OpenAI docs</a>.</p>
  ${'<p>filler paragraph with many words that pad the body up to the required threshold easily</p>'.repeat(40)}
</body></html>`;
    const robots = parseRobots(
      `User-agent: *\nAllow: /\n\nUser-agent: GPTBot\nAllow: /\n\nUser-agent: Google-Extended\nAllow: /\n\nUser-agent: ClaudeBot\nAllow: /\n\nUser-agent: PerplexityBot\nAllow: /\n\nUser-agent: CCBot\nAllow: /\n\nUser-agent: Amazonbot\nAllow: /\n\nSitemap: https://example.com/sitemap.xml\n`,
    );
    const llmsTxt = parseLlmsTxt('# Site\n\n> overview\n\n## Docs\n- [a](https://example.com/a)');
    const llmsFullTxt =
      '# Site full mirror\n\n' +
      'This is the full-text mirror of every page worth citing on this site. '.repeat(20);
    const report = await runRules(
      makeCtx({
        html,
        robots,
        llmsTxt,
        llmsFullTxt,
        sitemap: { urls: ['https://example.com/post'] },
        jsonLd: [
          {
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: 'A deep dive into GEO for 2026',
            author: { '@type': 'Person', name: 'Alice' },
            datePublished: recentIso,
            dateModified: recentIso,
            publisher: {
              '@type': 'Organization',
              name: 'Example Co',
              sameAs: [
                'https://en.wikipedia.org/wiki/Example',
                'https://www.linkedin.com/company/example',
              ],
            },
          },
        ],
      }),
      defaultRules,
    );
    expect(report.overall).toBeGreaterThanOrEqual(85);
    expect(report.categories.crawler.score).toBeGreaterThanOrEqual(85);
    expect(report.categories['structured-data'].score).toBeGreaterThanOrEqual(85);
    expect(report.categories.citation.score).toBeGreaterThanOrEqual(90);
    expect(report.categories.content.score).toBeGreaterThanOrEqual(80);
  });

  it('scores a barebones page lowly', async () => {
    const html = `<html><body><div>hi</div></body></html>`;
    const report = await runRules(makeCtx({ html, finalUrl: 'http://example.com' }), defaultRules);
    expect(report.overall).toBeLessThanOrEqual(25);
    expect(report.categories['structured-data'].score).toBe(0);
  });

  it('same input is deterministic', async () => {
    const a = await runRules(makeCtx(), defaultRules);
    const b = await runRules(makeCtx(), defaultRules);
    expect(a.overall).toBe(b.overall);
  });
});
