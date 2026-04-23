import { describe, it, expect } from 'vitest';
import type { AuditReport } from '../../src/types.js';
import { toCsv } from '../../src/reporters/csv.js';
import { toMarkdown } from '../../src/reporters/markdown.js';
import { toSarif } from '../../src/reporters/sarif.js';
import { diffReports, formatDiffLine } from '../../src/reporters/diff.js';

function fakeReport(overrides: Partial<AuditReport> = {}): AuditReport {
  const base: AuditReport = {
    schemaVersion: 1,
    url: 'https://example.com',
    finalUrl: 'https://example.com',
    fetchedAt: '2026-04-23T00:00:00.000Z',
    renderMode: 'static',
    overall: 72,
    warnings: [],
    version: '0.3.0',
    meta: { toolVersion: '0.3.0', nodeVersion: process.versions.node },
    timing: { fetchMs: 100, auditMs: 50, totalMs: 150 },
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
            group: 'diagnostic',
            impact: 'critical',
            effort: 'medium',
            docsUrl: 'https://example.com/docs/https',
            status: 'pass',
            score: 1,
            rationale: 'OK',
            durationMs: 1,
          },
        ],
      },
      'structured-data': {
        score: 60,
        weight: 30,
        results: [
          {
            id: 'sd.jsonld-present',
            stableId: 'sd.jsonld-present',
            title: 'JSON-LD present',
            weight: 5,
            group: 'diagnostic',
            impact: 'critical',
            effort: 'medium',
            docsUrl: 'https://example.com/docs/jsonld',
            status: 'fail',
            score: 0,
            rationale: 'Missing JSON-LD, "evil"\nnewline',
            estimatedImpact: 5,
            fixHint: 'Add a script.',
            durationMs: 2,
          },
        ],
      },
      citation: { score: 75, weight: 25, results: [] },
      content: { score: 75, weight: 20, results: [] },
    },
  };
  return { ...base, ...overrides };
}

describe('csv reporter', () => {
  it('emits header + one row per result, escaping commas/quotes/newlines', () => {
    const csv = toCsv(fakeReport());
    const lines = csv.trim().split('\n');
    expect(lines[0]).toContain('url,category,id');
    // 1 header + 2 data rows; the second row contains a literal \n inside a quoted field,
    // so a naive split('\n') sees 4 physical lines.
    expect(lines).toHaveLength(4);
    expect(csv).toContain('"Missing JSON-LD, ""evil""\nnewline"');
  });
});

describe('markdown reporter', () => {
  it('renders score badges, issue table, and footer', () => {
    const md = toMarkdown(fakeReport());
    expect(md).toContain('## geo-checker');
    expect(md).toContain('img.shields.io/badge/score-72');
    expect(md).toContain('### Issues to address');
    expect(md).toContain('sd.jsonld-present');
    expect(md).toContain('geo-checker v0.3.0');
  });
  it('shows all-pass message when no issues', () => {
    const r = fakeReport();
    r.categories['structured-data'].results[0]!.status = 'pass';
    r.categories['structured-data'].results[0]!.score = 1;
    const md = toMarkdown(r);
    expect(md).toContain('All audited rules pass');
  });
});

describe('sarif reporter', () => {
  it('emits SARIF 2.1.0 with rules and results', () => {
    const json = toSarif(fakeReport());
    const parsed = JSON.parse(json);
    expect(parsed.version).toBe('2.1.0');
    expect(parsed.runs[0].tool.driver.name).toBe('geo-checker');
    expect(parsed.runs[0].tool.driver.rules.length).toBeGreaterThan(0);
    expect(parsed.runs[0].results.length).toBe(1);
    expect(parsed.runs[0].results[0].ruleId).toBe('sd.jsonld-present');
    expect(parsed.runs[0].results[0].level).toBe('error');
  });
  it('omits passing rules from results but includes them in rule registry', () => {
    const json = toSarif(fakeReport());
    const parsed = JSON.parse(json);
    const ruleIds = parsed.runs[0].tool.driver.rules.map((r: { id: string }) => r.id);
    expect(ruleIds).toContain('crawler.https');
    expect(ruleIds).toContain('sd.jsonld-present');
  });
});

describe('diff reporter', () => {
  it('detects regressions, fixes, and new failures', () => {
    const before = fakeReport({ overall: 80 });
    before.categories['structured-data'].results[0]!.status = 'pass';
    before.categories['structured-data'].results[0]!.score = 1;
    const after = fakeReport({ overall: 72 });
    const d = diffReports(before, after);
    expect(d.overallDelta).toBe(-8);
    expect(d.regressions).toHaveLength(1);
    expect(d.regressions[0]!.id).toBe('sd.jsonld-present');
    expect(d.fixes).toHaveLength(0);
  });
  it('detects fixes', () => {
    const before = fakeReport();
    const after = fakeReport({ overall: 80 });
    after.categories['structured-data'].results[0]!.status = 'pass';
    after.categories['structured-data'].results[0]!.score = 1;
    const d = diffReports(before, after);
    expect(d.fixes).toHaveLength(1);
  });
  it('formats a one-line summary', () => {
    const before = fakeReport({ overall: 80 });
    before.categories['structured-data'].results[0]!.status = 'pass';
    before.categories['structured-data'].results[0]!.score = 1;
    const after = fakeReport({ overall: 72 });
    const line = formatDiffLine(diffReports(before, after));
    expect(line).toContain('overall');
    expect(line).toContain('-8');
    expect(line).toContain('regression');
  });
});
