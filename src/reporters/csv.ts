import type { AuditReport, Category } from '../types.js';

const COLS = [
  'url',
  'category',
  'id',
  'stableId',
  'title',
  'status',
  'score',
  'weight',
  'group',
  'impact',
  'effort',
  'estimatedImpact',
  'durationMs',
  'rationale',
  'docsUrl',
] as const;

function escape(v: unknown): string {
  if (v === undefined || v === null) return '';
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsv(report: AuditReport): string {
  const rows: string[] = [COLS.join(',')];
  for (const cat of Object.keys(report.categories) as Category[]) {
    for (const r of report.categories[cat].results) {
      rows.push(
        [
          report.finalUrl,
          cat,
          r.id,
          r.stableId ?? '',
          r.title,
          r.status,
          r.score,
          r.weight,
          r.group ?? '',
          r.impact ?? '',
          r.effort ?? '',
          r.estimatedImpact ?? '',
          r.durationMs ?? '',
          r.rationale,
          r.docsUrl ?? '',
        ]
          .map(escape)
          .join(','),
      );
    }
  }
  return rows.join('\n') + '\n';
}
