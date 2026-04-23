import { describe, it, expect } from 'vitest';
import { load } from 'cheerio';
import { runRules } from '../src/engine.js';
import { defineRule } from '../src/index.js';
import type { AuditContext } from '../src/types.js';

function fakeContext(): AuditContext {
  const $ = load('<html><body>hi</body></html>');
  return {
    url: 'https://example.com',
    finalUrl: 'https://example.com',
    html: '<html><body>hi</body></html>',
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
  };
}

describe('runRules', () => {
  it('aggregates weighted category and overall scores', async () => {
    const rules = [
      defineRule({
        id: 'test.pass',
        category: 'crawler',
        weight: 2,
        title: 'pass',
        description: '',
        run: () => ({ status: 'pass', score: 1, rationale: 'ok' }),
      }),
      defineRule({
        id: 'test.fail',
        category: 'crawler',
        weight: 2,
        title: 'fail',
        description: '',
        run: () => ({ status: 'fail', score: 0, rationale: 'no' }),
      }),
    ];
    const report = await runRules(fakeContext(), rules);
    expect(report.categories.crawler.score).toBe(50);
    expect(report.overall).toBe(50);
    expect(report.categories.crawler.results).toHaveLength(2);
  });

  it('skips skipped rules from scoring', async () => {
    const rules = [
      defineRule({
        id: 'test.skip',
        category: 'crawler',
        weight: 10,
        title: 's',
        description: '',
        run: () => ({ status: 'skip', score: 0, rationale: 'na' }),
      }),
      defineRule({
        id: 'test.pass',
        category: 'crawler',
        weight: 2,
        title: 'p',
        description: '',
        run: () => ({ status: 'pass', score: 1, rationale: 'ok' }),
      }),
    ];
    const report = await runRules(fakeContext(), rules);
    expect(report.categories.crawler.score).toBe(100);
  });

  it('catches rule crashes as skip', async () => {
    const rules = [
      defineRule({
        id: 'test.crash',
        category: 'crawler',
        weight: 1,
        title: 'c',
        description: '',
        run: () => {
          throw new Error('boom');
        },
      }),
    ];
    const report = await runRules(fakeContext(), rules);
    expect(report.categories.crawler.results[0]?.status).toBe('skip');
    expect(report.categories.crawler.results[0]?.rationale).toContain('boom');
  });

  it('filters by --only', async () => {
    const rules = [
      defineRule({
        id: 'a',
        category: 'crawler',
        weight: 1,
        title: '',
        description: '',
        run: () => ({ status: 'pass', score: 1, rationale: '' }),
      }),
      defineRule({
        id: 'b',
        category: 'crawler',
        weight: 1,
        title: '',
        description: '',
        run: () => ({ status: 'pass', score: 1, rationale: '' }),
      }),
    ];
    const report = await runRules(fakeContext(), rules, { only: ['a'] });
    expect(report.categories.crawler.results).toHaveLength(1);
    expect(report.categories.crawler.results[0]?.id).toBe('a');
  });

  it('populates schemaVersion, meta, and timing', async () => {
    const rules = [
      defineRule({
        id: 'ok',
        category: 'crawler',
        weight: 1,
        title: 'ok',
        description: '',
        run: () => ({ status: 'pass', score: 1, rationale: '' }),
      }),
    ];
    const report = await runRules(fakeContext(), rules, { fetchMs: 42 });
    expect(report.schemaVersion).toBe(1);
    expect(report.meta.toolVersion).toMatch(/^\d+\.\d+\.\d+$/);
    expect(report.meta.nodeVersion).toBe(process.versions.node);
    expect(report.timing.fetchMs).toBe(42);
    expect(report.timing.auditMs).toBeGreaterThanOrEqual(0);
    expect(report.timing.totalMs).toBeGreaterThanOrEqual(report.timing.auditMs);
  });

  it('propagates rule metadata onto results', async () => {
    const rules = [
      defineRule({
        id: 'm',
        stableId: 'stable.m',
        category: 'crawler',
        group: 'opportunity',
        weight: 3,
        impact: 'high',
        effort: 'low',
        docsUrl: 'https://example.com/docs',
        title: 'meta',
        description: '',
        run: () => ({ status: 'warn', score: 0.5, rationale: 'x', estimatedImpact: 7 }),
      }),
    ];
    const report = await runRules(fakeContext(), rules);
    const r = report.categories.crawler.results[0]!;
    expect(r.stableId).toBe('stable.m');
    expect(r.group).toBe('opportunity');
    expect(r.impact).toBe('high');
    expect(r.effort).toBe('low');
    expect(r.docsUrl).toBe('https://example.com/docs');
    expect(r.estimatedImpact).toBe(7);
    expect(r.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('filters by stableId as well as id', async () => {
    const rules = [
      defineRule({
        id: 'new.name',
        stableId: 'legacy.a',
        category: 'crawler',
        weight: 1,
        title: '',
        description: '',
        run: () => ({ status: 'pass', score: 1, rationale: '' }),
      }),
      defineRule({
        id: 'new.other',
        stableId: 'legacy.b',
        category: 'crawler',
        weight: 1,
        title: '',
        description: '',
        run: () => ({ status: 'pass', score: 1, rationale: '' }),
      }),
    ];
    const report = await runRules(fakeContext(), rules, { only: ['legacy.a'] });
    expect(report.categories.crawler.results).toHaveLength(1);
    expect(report.categories.crawler.results[0]?.stableId).toBe('legacy.a');
  });
});
