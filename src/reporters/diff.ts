import type { AuditReport, Category, RuleResultEntry } from '../types.js';

export interface RuleDelta {
  id: string;
  stableId?: string;
  category: Category;
  before: RuleResultEntry['status'];
  after: RuleResultEntry['status'];
  scoreDelta: number;
}

export interface CategoryDelta {
  category: Category;
  before: number;
  after: number;
  delta: number;
}

export interface ReportDiff {
  before: { url: string; overall: number; version: string; fetchedAt: string };
  after: { url: string; overall: number; version: string; fetchedAt: string };
  overallDelta: number;
  categories: CategoryDelta[];
  regressions: RuleDelta[];
  fixes: RuleDelta[];
  newFailures: RuleDelta[];
}

const SEVERITY: Record<RuleResultEntry['status'], number> = { skip: 0, pass: 1, warn: 2, fail: 3 };

function indexResults(report: AuditReport): Map<string, { entry: RuleResultEntry; category: Category }> {
  const map = new Map<string, { entry: RuleResultEntry; category: Category }>();
  for (const cat of Object.keys(report.categories) as Category[]) {
    for (const r of report.categories[cat].results) {
      const key = r.stableId ?? r.id;
      map.set(key, { entry: r, category: cat });
    }
  }
  return map;
}

export function diffReports(before: AuditReport, after: AuditReport): ReportDiff {
  const beforeMap = indexResults(before);
  const afterMap = indexResults(after);

  const regressions: RuleDelta[] = [];
  const fixes: RuleDelta[] = [];
  const newFailures: RuleDelta[] = [];

  for (const [key, b] of beforeMap) {
    const a = afterMap.get(key);
    if (!a) continue;
    const before = b.entry.status;
    const after = a.entry.status;
    if (SEVERITY[after] > SEVERITY[before]) {
      regressions.push({
        id: a.entry.id,
        ...(a.entry.stableId !== undefined ? { stableId: a.entry.stableId } : {}),
        category: a.category,
        before,
        after,
        scoreDelta: a.entry.score - b.entry.score,
      });
    } else if (SEVERITY[after] < SEVERITY[before] && (before === 'fail' || before === 'warn')) {
      fixes.push({
        id: a.entry.id,
        ...(a.entry.stableId !== undefined ? { stableId: a.entry.stableId } : {}),
        category: a.category,
        before,
        after,
        scoreDelta: a.entry.score - b.entry.score,
      });
    }
  }

  for (const [key, a] of afterMap) {
    if (beforeMap.has(key)) continue;
    if (a.entry.status === 'fail' || a.entry.status === 'warn') {
      newFailures.push({
        id: a.entry.id,
        ...(a.entry.stableId !== undefined ? { stableId: a.entry.stableId } : {}),
        category: a.category,
        before: 'skip',
        after: a.entry.status,
        scoreDelta: a.entry.score,
      });
    }
  }

  const categories: CategoryDelta[] = (Object.keys(after.categories) as Category[]).map((c) => ({
    category: c,
    before: before.categories[c]?.score ?? 0,
    after: after.categories[c].score,
    delta: after.categories[c].score - (before.categories[c]?.score ?? 0),
  }));

  return {
    before: { url: before.finalUrl, overall: before.overall, version: before.version, fetchedAt: before.fetchedAt },
    after: { url: after.finalUrl, overall: after.overall, version: after.version, fetchedAt: after.fetchedAt },
    overallDelta: after.overall - before.overall,
    categories,
    regressions,
    fixes,
    newFailures,
  };
}

const ARROW_UP = '↑';
const ARROW_DOWN = '↓';
const ARROW_FLAT = '·';

function arrow(d: number): string {
  if (d > 0) return ARROW_UP;
  if (d < 0) return ARROW_DOWN;
  return ARROW_FLAT;
}

export function formatDiffLine(diff: ReportDiff): string {
  const overall = `overall ${arrow(diff.overallDelta)} ${diff.overallDelta >= 0 ? '+' : ''}${diff.overallDelta}`;
  const cats = diff.categories
    .filter((c) => c.delta !== 0)
    .map((c) => `${c.category} ${arrow(c.delta)} ${c.delta >= 0 ? '+' : ''}${c.delta}`)
    .join(' · ');
  const reg = diff.regressions.length;
  const fix = diff.fixes.length;
  const nu = diff.newFailures.length;
  const tail = [
    reg > 0 ? `🆕 ${reg} regression${reg > 1 ? 's' : ''}` : '',
    nu > 0 ? `+${nu} new fail${nu > 1 ? 's' : ''}` : '',
    fix > 0 ? `✅ ${fix} fixed` : '',
  ]
    .filter(Boolean)
    .join(' · ');
  return [overall, cats, tail].filter(Boolean).join('  ·  ');
}
