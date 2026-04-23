import { describe, it, expect } from 'vitest';
import { load } from 'cheerio';
import { toHtml } from '../../src/reporters/html.js';
import type { AuditReport } from '../../src/types.js';

function makeReport(overrides: Partial<AuditReport> = {}): AuditReport {
  return {
    schemaVersion: 1,
    url: 'https://example.com/',
    finalUrl: 'https://example.com/',
    fetchedAt: '2026-04-23T00:00:00.000Z',
    renderMode: 'static',
    overall: 72,
    warnings: ['Site appears to be JS-rendered. Re-run with --render.'],
    version: '0.2.0',
    meta: { toolVersion: '0.2.0', nodeVersion: '20.18.1' },
    timing: { fetchMs: 120, auditMs: 15, totalMs: 140 },
    categories: {
      crawler: {
        score: 80,
        weight: 25,
        results: [
          {
            id: 'crawler.https',
            stableId: 'crawler.https',
            title: 'HTTPS',
            weight: 2,
            status: 'pass',
            score: 1,
            rationale: 'OK',
            impact: 'critical',
            effort: 'medium',
            group: 'diagnostic',
            docsUrl: 'https://example.com/docs#https',
          },
          {
            id: 'crawler.sitemap-present',
            stableId: 'crawler.sitemap-present',
            title: 'Sitemap',
            weight: 4,
            status: 'fail',
            score: 0,
            rationale: 'No sitemap found.',
            impact: 'high',
            effort: 'low',
            group: 'diagnostic',
            docsUrl: 'https://example.com/docs#sitemap',
            fixHint: 'Publish /sitemap.xml',
          },
        ],
      },
      'structured-data': {
        score: 50,
        weight: 30,
        results: [
          {
            id: 'sd.required-fields',
            stableId: 'sd.required-fields',
            title: 'Required fields',
            weight: 6,
            status: 'warn',
            score: 0.5,
            rationale: 'Missing datePublished.',
            impact: 'high',
            effort: 'medium',
            group: 'opportunity',
            estimatedImpact: 12,
            docsUrl: 'https://example.com/docs#required',
            locations: [{ selector: 'script[type="application/ld+json"]', snippet: '{ "@type": "Article" }' }],
          },
        ],
      },
      citation: { score: 90, weight: 25, results: [] },
      content: { score: 70, weight: 20, results: [] },
    },
    ...overrides,
  };
}

describe('HTML reporter', () => {
  it('produces a standalone <!doctype html> document', () => {
    const html = toHtml(makeReport());
    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html).toContain('</html>');
  });

  it('embeds the full report JSON payload for round-trip recovery', () => {
    const report = makeReport();
    const html = toHtml(report);
    const $ = load(html);
    const payload = $('#geo-report-data').html();
    expect(payload).toBeTruthy();
    const parsed = JSON.parse(payload!);
    expect(parsed.overall).toBe(report.overall);
    expect(parsed.schemaVersion).toBe(1);
    expect(parsed.categories.crawler.results).toHaveLength(2);
  });

  it('puts failed opportunities before diagnostics when both exist', () => {
    const html = toHtml(makeReport());
    const oppIdx = html.indexOf('Opportunities');
    const diagIdx = html.indexOf('Diagnostics');
    expect(oppIdx).toBeGreaterThan(-1);
    expect(diagIdx).toBeGreaterThan(-1);
    expect(oppIdx).toBeLessThan(diagIdx);
  });

  it('renders score rings with the overall and category scores', () => {
    const html = toHtml(makeReport());
    const $ = load(html);
    const rings = $('.ring');
    expect(rings.length).toBeGreaterThan(1);
    expect(html).toContain('>72<');
    expect(html).toContain('>80<');
  });

  it('escapes HTML-unsafe characters in rationales', () => {
    const report = makeReport();
    report.categories.crawler.results[1]!.rationale = 'Tag <script>alert(1)</script> & "quotes"';
    const html = toHtml(report);
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).toContain('&amp;');
    expect(html).toContain('&quot;');
  });

  it('escapes the closing-script sequence inside the embedded JSON', () => {
    const report = makeReport();
    report.categories.crawler.results[1]!.rationale = 'contains </script> breakout attempt';
    const html = toHtml(report);
    const scriptBlocks = html.split('<script type="application/json"');
    expect(scriptBlocks.length).toBe(2);
    const afterPayload = scriptBlocks[1]!;
    const firstClose = afterPayload.indexOf('</script>');
    const anyBreakout = afterPayload.substring(0, firstClose).includes('</script');
    expect(anyBreakout).toBe(false);
  });

  it('renders fix hints and docs links for failing audits', () => {
    const html = toHtml(makeReport());
    expect(html).toContain('Publish /sitemap.xml');
    expect(html).toContain('https://example.com/docs#sitemap');
  });

  it('shows warnings when present', () => {
    const html = toHtml(makeReport());
    expect(html).toContain('JS-rendered');
  });
});
