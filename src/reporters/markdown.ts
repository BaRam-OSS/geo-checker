import type { AuditReport, Category, Status } from '../types.js';

const CATEGORY_LABELS: Record<Category, string> = {
  crawler: 'AI Crawler Access',
  'structured-data': 'Structured Data',
  citation: 'Citation Signals',
  content: 'Content Structure',
};

function scoreBadge(score: number): string {
  const color = score >= 85 ? 'brightgreen' : score >= 60 ? 'yellow' : 'red';
  return `![${score}](https://img.shields.io/badge/score-${score}-${color})`;
}

function statusEmoji(s: Status): string {
  switch (s) {
    case 'pass':
      return '✅';
    case 'warn':
      return '⚠️';
    case 'fail':
      return '❌';
    default:
      return '⏭️';
  }
}

function escapeMd(s: string): string {
  return s.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

export function toMarkdown(report: AuditReport): string {
  const lines: string[] = [];
  lines.push(`## geo-checker · ${report.finalUrl}`);
  lines.push('');
  lines.push(`**Overall:** ${scoreBadge(report.overall)}`);
  lines.push('');
  lines.push('| Category | Score |');
  lines.push('| --- | --- |');
  for (const cat of Object.keys(report.categories) as Category[]) {
    const b = report.categories[cat];
    if (b.results.length === 0) continue;
    lines.push(`| ${CATEGORY_LABELS[cat]} | ${scoreBadge(b.score)} |`);
  }
  lines.push('');
  const failing = Object.values(report.categories)
    .flatMap((c) => c.results)
    .filter((r) => r.status === 'fail' || r.status === 'warn')
    .sort((a, b) => (b.estimatedImpact ?? 0) - (a.estimatedImpact ?? 0));
  if (failing.length > 0) {
    lines.push('### Issues to address');
    lines.push('');
    lines.push('| | Rule | Impact | Hint |');
    lines.push('| --- | --- | --- | --- |');
    for (const r of failing) {
      const idLink = r.docsUrl ? `[${r.stableId ?? r.id}](${r.docsUrl})` : (r.stableId ?? r.id);
      const impact = r.impact ? `\`${r.impact}\`` : '';
      const hint = escapeMd(r.fixHint ?? r.rationale);
      lines.push(`| ${statusEmoji(r.status)} | ${idLink} | ${impact} | ${hint} |`);
    }
    lines.push('');
  } else {
    lines.push('All audited rules pass. ✅');
    lines.push('');
  }
  if (report.warnings.length > 0) {
    lines.push('> ' + report.warnings.map(escapeMd).join('  \n> '));
    lines.push('');
  }
  lines.push(
    `<sub>geo-checker v${report.version} · ${report.renderMode} · fetched ${report.fetchedAt} · ${report.timing.totalMs}ms</sub>`,
  );
  lines.push('');
  return lines.join('\n');
}
