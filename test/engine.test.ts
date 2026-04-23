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
});
