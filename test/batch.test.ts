import { describe, it, expect, vi, afterEach } from 'vitest';
import { runBatch, summaryToJson, urlToSlug } from '../src/batch.js';

const mocks = vi.hoisted(() => ({ audit: vi.fn() }));

vi.mock('../src/index.js', () => ({
  audit: mocks.audit,
}));

afterEach(() => {
  mocks.audit.mockReset();
});

function fakeReport(overall: number) {
  return {
    schemaVersion: 1,
    url: 'x',
    finalUrl: 'x',
    fetchedAt: '',
    renderMode: 'static',
    overall,
    warnings: [],
    version: '0.3.0',
    meta: { toolVersion: '0.3.0', nodeVersion: '20' },
    timing: { fetchMs: 0, auditMs: 0, totalMs: 0 },
    categories: {
      crawler: { score: overall, weight: 25, results: [] },
      'structured-data': { score: overall, weight: 30, results: [] },
      citation: { score: overall, weight: 25, results: [] },
      content: { score: overall, weight: 20, results: [] },
    },
  };
}

describe('runBatch', () => {
  it('runs all URLs and aggregates summary', async () => {
    mocks.audit
      .mockResolvedValueOnce(fakeReport(80))
      .mockResolvedValueOnce(fakeReport(60))
      .mockResolvedValueOnce(fakeReport(100));
    const summary = await runBatch(['a', 'b', 'c'], { concurrency: 2 });
    expect(summary.total).toBe(3);
    expect(summary.successes).toBe(3);
    expect(summary.failures).toBe(0);
    expect(summary.averageOverall).toBe(80);
    expect(summary.worstOverall).toBe(60);
    expect(summary.bestOverall).toBe(100);
  });

  it('isolates per-URL failures', async () => {
    mocks.audit
      .mockResolvedValueOnce(fakeReport(80))
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValueOnce(fakeReport(50));
    const summary = await runBatch(['a', 'b', 'c']);
    expect(summary.successes).toBe(2);
    expect(summary.failures).toBe(1);
    expect(summary.results[1]).toMatchObject({ ok: false, url: 'b', error: 'timeout' });
  });

  it('emits progress events', async () => {
    mocks.audit.mockResolvedValueOnce(fakeReport(80));
    const events: string[] = [];
    await runBatch(['a'], {
      onProgress: (e) => events.push(e.kind),
    });
    expect(events).toEqual(['start', 'success']);
  });
});

describe('summaryToJson', () => {
  it('serialises a compact summary', async () => {
    mocks.audit.mockResolvedValueOnce(fakeReport(80));
    const summary = await runBatch(['https://example.com']);
    const obj = JSON.parse(summaryToJson(summary));
    expect(obj.total).toBe(1);
    expect(obj.results[0].overall).toBe(80);
    expect(obj.results[0].categories.crawler).toBe(80);
  });
});

describe('urlToSlug', () => {
  it('produces filesystem-safe slugs', () => {
    expect(urlToSlug('https://example.com/blog/post')).toBe('example.com_blog_post');
    expect(urlToSlug('https://example.com/')).toBe('example.com');
  });
});
