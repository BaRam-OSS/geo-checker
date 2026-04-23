import type { AuditOptions, AuditReport } from './types.js';
import { audit } from './index.js';

export interface BatchOptions extends AuditOptions {
  concurrency?: number;
  onProgress?: (event: BatchProgressEvent) => void;
}

export interface BatchSuccess {
  url: string;
  report: AuditReport;
}

export interface BatchFailure {
  url: string;
  error: string;
}

export type BatchResult = ({ ok: true } & BatchSuccess) | ({ ok: false } & BatchFailure);

export interface BatchSummary {
  total: number;
  successes: number;
  failures: number;
  averageOverall: number;
  worstOverall: number | null;
  bestOverall: number | null;
  results: BatchResult[];
}

export type BatchProgressEvent =
  | { kind: 'start'; url: string; index: number; total: number }
  | { kind: 'success'; url: string; overall: number; index: number; total: number }
  | { kind: 'failure'; url: string; error: string; index: number; total: number };

export async function runBatch(urls: string[], options: BatchOptions = {}): Promise<BatchSummary> {
  const concurrency = Math.max(1, options.concurrency ?? 4);
  const results: BatchResult[] = new Array(urls.length);
  const onProgress = options.onProgress;
  const auditOpts: AuditOptions = { ...options };
  delete (auditOpts as BatchOptions).concurrency;
  delete (auditOpts as BatchOptions).onProgress;

  let cursor = 0;
  async function worker(): Promise<void> {
    for (;;) {
      const i = cursor++;
      if (i >= urls.length) return;
      const url = urls[i]!;
      onProgress?.({ kind: 'start', url, index: i, total: urls.length });
      try {
        const report = await audit(url, auditOpts);
        results[i] = { ok: true, url, report };
        onProgress?.({ kind: 'success', url, overall: report.overall, index: i, total: urls.length });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        results[i] = { ok: false, url, error: message };
        onProgress?.({ kind: 'failure', url, error: message, index: i, total: urls.length });
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, urls.length) }, worker));

  const successes = results.filter((r): r is BatchResult & { ok: true } => r.ok);
  const failures = results.filter((r): r is BatchResult & { ok: false } => !r.ok);
  const overalls = successes.map((s) => s.report.overall);
  const averageOverall =
    overalls.length === 0 ? 0 : Math.round(overalls.reduce((a, b) => a + b, 0) / overalls.length);

  return {
    total: urls.length,
    successes: successes.length,
    failures: failures.length,
    averageOverall,
    worstOverall: overalls.length === 0 ? null : Math.min(...overalls),
    bestOverall: overalls.length === 0 ? null : Math.max(...overalls),
    results,
  };
}

export function summaryToJson(summary: BatchSummary): string {
  return JSON.stringify(
    {
      total: summary.total,
      successes: summary.successes,
      failures: summary.failures,
      averageOverall: summary.averageOverall,
      worstOverall: summary.worstOverall,
      bestOverall: summary.bestOverall,
      results: summary.results.map((r) =>
        r.ok
          ? {
              ok: true,
              url: r.url,
              overall: r.report.overall,
              categories: Object.fromEntries(
                Object.entries(r.report.categories).map(([k, v]) => [k, v.score]),
              ),
            }
          : { ok: false, url: r.url, error: r.error },
      ),
    },
    null,
    2,
  );
}

export function urlToSlug(url: string): string {
  try {
    const u = new URL(url);
    const base = (u.hostname + u.pathname).replace(/\/+$/, '');
    const slug = base.replace(/[^a-zA-Z0-9.-]+/g, '_').replace(/^_+|_+$/g, '');
    return slug || 'page';
  } catch {
    return url.replace(/[^a-zA-Z0-9.-]+/g, '_').slice(0, 80) || 'page';
  }
}
