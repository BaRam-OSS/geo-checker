import { describe, it, expect } from 'vitest';
import { load } from 'cheerio';
import type { AuditContext } from '../../src/types.js';
import { llmsFullTxtRule } from '../../src/rules/crawler/llms-full-txt.js';
import { sameAsEntityRule } from '../../src/rules/structured-data/sameas-entity.js';
import { breadcrumbValidRule } from '../../src/rules/structured-data/breadcrumb-valid.js';
import { contentFreshnessRule } from '../../src/rules/citation/content-freshness.js';
import { qaStructureRule } from '../../src/rules/content/qa-structure.js';
import { externalCitationsRule } from '../../src/rules/content/external-citations.js';

function ctx(overrides: Partial<AuditContext> = {}): AuditContext {
  const html = overrides.html ?? '<html><body></body></html>';
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

describe('crawler.llms-full-txt', () => {
  it('passes when llms-full.txt is substantial', async () => {
    const r = await llmsFullTxtRule.run(ctx({ llmsFullTxt: 'x'.repeat(500) }));
    expect(r.status).toBe('pass');
    expect(r.score).toBe(1);
  });
  it('warns when too short', async () => {
    const r = await llmsFullTxtRule.run(ctx({ llmsFullTxt: 'short' }));
    expect(r.status).toBe('warn');
    expect(r.score).toBe(0.5);
  });
  it('warns when missing', async () => {
    const r = await llmsFullTxtRule.run(ctx());
    expect(r.status).toBe('warn');
    expect(r.score).toBe(0);
  });
});

describe('sd.sameas-entity', () => {
  it('skips when no JSON-LD', async () => {
    const r = await sameAsEntityRule.run(ctx());
    expect(r.status).toBe('skip');
  });
  it('skips when no entity nodes', async () => {
    const r = await sameAsEntityRule.run(
      ctx({ jsonLd: [{ '@type': 'Article', headline: 'x' }] }),
    );
    expect(r.status).toBe('skip');
  });
  it('passes when 2+ trusted hosts', async () => {
    const r = await sameAsEntityRule.run(
      ctx({
        jsonLd: [
          {
            '@type': 'Organization',
            name: 'Acme',
            sameAs: ['https://en.wikipedia.org/wiki/Acme', 'https://www.linkedin.com/company/acme'],
          },
        ],
      }),
    );
    expect(r.status).toBe('pass');
    expect(r.score).toBe(1);
  });
  it('warns when sameAs missing', async () => {
    const r = await sameAsEntityRule.run(
      ctx({ jsonLd: [{ '@type': 'Organization', name: 'Acme' }] }),
    );
    expect(r.status).toBe('warn');
    expect(r.score).toBe(0);
  });
});

describe('sd.breadcrumb-valid', () => {
  it('skips when no BreadcrumbList', async () => {
    const r = await breadcrumbValidRule.run(ctx({ jsonLd: [{ '@type': 'Article', headline: 'x' }] }));
    expect(r.status).toBe('skip');
  });
  it('passes when items have position/name/item', async () => {
    const r = await breadcrumbValidRule.run(
      ctx({
        jsonLd: [
          {
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://example.com/' },
              { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://example.com/blog' },
            ],
          },
        ],
      }),
    );
    expect(r.status).toBe('pass');
  });
  it('flags missing position', async () => {
    const r = await breadcrumbValidRule.run(
      ctx({
        jsonLd: [
          {
            '@type': 'BreadcrumbList',
            itemListElement: [{ '@type': 'ListItem', name: 'Home', item: 'https://example.com/' }],
          },
        ],
      }),
    );
    expect(r.status).not.toBe('pass');
    expect(r.score).toBeLessThan(1);
  });
});

describe('cit.content-freshness', () => {
  it('skips when no Article JSON-LD', async () => {
    const r = await contentFreshnessRule.run(ctx());
    expect(r.status).toBe('skip');
  });
  it('passes when dateModified is recent', async () => {
    const recent = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const r = await contentFreshnessRule.run(
      ctx({ jsonLd: [{ '@type': 'Article', dateModified: recent }] }),
    );
    expect(r.status).toBe('pass');
  });
  it('warns when older than 2 years', async () => {
    const old = new Date(Date.now() - 800 * 24 * 60 * 60 * 1000).toISOString();
    const r = await contentFreshnessRule.run(
      ctx({ jsonLd: [{ '@type': 'Article', dateModified: old }] }),
    );
    expect(r.status).toBe('warn');
    expect(r.score).toBeLessThanOrEqual(0.2);
  });
  it('warns when dates missing', async () => {
    const r = await contentFreshnessRule.run(ctx({ jsonLd: [{ '@type': 'Article', headline: 'x' }] }));
    expect(r.status).toBe('warn');
  });
});

describe('cnt.qa-structure', () => {
  it('passes with FAQPage JSON-LD', async () => {
    const r = await qaStructureRule.run(ctx({ jsonLd: [{ '@type': 'FAQPage', mainEntity: [] }] }));
    expect(r.status).toBe('pass');
  });
  it('passes with 2+ question H2s', async () => {
    const r = await qaStructureRule.run(
      ctx({ html: '<html><body><h2>What is X?</h2><h2>How do I Y?</h2></body></html>' }),
    );
    expect(r.status).toBe('pass');
  });
  it('passes with Korean question H2s', async () => {
    const r = await qaStructureRule.run(
      ctx({ html: '<html><body><h2>왜 GEO인가?</h2><h2>어떻게 적용하나요?</h2></body></html>' }),
    );
    expect(r.status).toBe('pass');
  });
  it('warns with no question headings', async () => {
    const r = await qaStructureRule.run(
      ctx({ html: '<html><body><h2>Intro</h2><h2>Conclusion</h2></body></html>' }),
    );
    expect(r.status).toBe('warn');
  });
});

describe('cnt.external-citations', () => {
  it('passes with 3+ external hosts', async () => {
    const r = await externalCitationsRule.run(
      ctx({
        html: `<html><body><main>
          <a href="https://en.wikipedia.org/x">w</a>
          <a href="https://github.com/y">g</a>
          <a href="https://schema.org/z">s</a>
        </main></body></html>`,
      }),
    );
    expect(r.status).toBe('pass');
    expect(r.score).toBe(1);
  });
  it('partial pass with 1 external host', async () => {
    const r = await externalCitationsRule.run(
      ctx({ html: '<html><body><main><a href="https://example.org/x">x</a></main></body></html>' }),
    );
    expect(r.status).toBe('pass');
    expect(r.score).toBeLessThan(1);
  });
  it('skips internal links', async () => {
    const r = await externalCitationsRule.run(
      ctx({
        html: '<html><body><main><a href="/internal">a</a><a href="https://example.com/b">b</a></main></body></html>',
      }),
    );
    expect(r.status).toBe('warn');
  });
  it('skips nofollow links', async () => {
    const r = await externalCitationsRule.run(
      ctx({
        html: '<html><body><main><a rel="nofollow" href="https://other.com/x">x</a></main></body></html>',
      }),
    );
    expect(r.status).toBe('warn');
  });
});
