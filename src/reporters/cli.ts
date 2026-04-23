import kleur from 'kleur';
import Table from 'cli-table3';
import type { AuditReport, Category, Status } from '../types.js';

const CATEGORY_LABELS: Record<Category, string> = {
  crawler: 'AI Crawler Access',
  'structured-data': 'Structured Data',
  citation: 'Citation Signals',
  content: 'Content Structure',
};

function colorScore(score: number): string {
  if (score >= 85) return kleur.green().bold(`${score}`);
  if (score >= 60) return kleur.yellow().bold(`${score}`);
  return kleur.red().bold(`${score}`);
}

function statusBadge(status: Status): string {
  switch (status) {
    case 'pass':
      return kleur.green('pass');
    case 'warn':
      return kleur.yellow('warn');
    case 'fail':
      return kleur.red('fail');
    default:
      return kleur.gray('skip');
  }
}

function bar(score: number, width = 20): string {
  const filled = Math.round((score / 100) * width);
  const empty = width - filled;
  const color = score >= 85 ? kleur.green : score >= 60 ? kleur.yellow : kleur.red;
  return color('█'.repeat(filled)) + kleur.gray('░'.repeat(empty));
}

export function toCli(report: AuditReport): string {
  const lines: string[] = [];
  lines.push('');
  lines.push(
    kleur.bold('geo-checker') +
      kleur.gray(' · ') +
      report.finalUrl +
      kleur.gray(`  (${report.renderMode})`),
  );
  lines.push(
    kleur.gray('fetched ') +
      report.fetchedAt +
      kleur.gray('  ·  v') +
      report.version,
  );
  lines.push('');
  lines.push(kleur.bold('Overall ') + colorScore(report.overall) + kleur.gray(' / 100'));
  lines.push('');

  for (const cat of Object.keys(report.categories) as Category[]) {
    const b = report.categories[cat];
    if (b.results.length === 0) continue;
    lines.push(
      `  ${kleur.bold(CATEGORY_LABELS[cat].padEnd(20))} ${bar(b.score)}  ${colorScore(b.score).padStart(3)}/100`,
    );
    const table = new Table({
      head: [kleur.gray('status'), kleur.gray('rule'), kleur.gray('note')],
      colWidths: [7, 34, 70],
      wordWrap: true,
      style: { head: [], border: ['grey'] },
    });
    for (const r of b.results) {
      table.push([statusBadge(r.status), r.id, r.rationale]);
    }
    lines.push(
      table
        .toString()
        .split('\n')
        .map((l) => '    ' + l)
        .join('\n'),
    );
    lines.push('');
  }

  const fixUrls = Object.values(report.categories)
    .flatMap((c) => c.results)
    .filter((r) => (r.status === 'fail' || r.status === 'warn') && r.fixUrl)
    .map((r) => `  - ${r.id}: ${r.fixUrl}`);
  if (fixUrls.length > 0) {
    lines.push(kleur.bold('How to fix:'));
    lines.push(...fixUrls);
    lines.push('');
  }

  return lines.join('\n');
}
