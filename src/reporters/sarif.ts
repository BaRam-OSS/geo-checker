import type { AuditReport, RuleResultEntry, Status } from '../types.js';

interface SarifLocation {
  physicalLocation: {
    artifactLocation: { uri: string };
    region?: { startLine?: number; startColumn?: number; snippet?: { text: string } };
  };
}

interface SarifResult {
  ruleId: string;
  level: 'error' | 'warning' | 'note' | 'none';
  message: { text: string };
  locations: SarifLocation[];
  properties?: { score: number; weight: number; impact?: string; effort?: string; estimatedImpact?: number };
}

interface SarifRule {
  id: string;
  name: string;
  shortDescription: { text: string };
  fullDescription: { text: string };
  helpUri?: string;
  defaultConfiguration: { level: 'error' | 'warning' | 'note' };
  properties: { category: string; weight: number; impact?: string; effort?: string };
}

function statusToLevel(s: Status): 'error' | 'warning' | 'note' | 'none' {
  if (s === 'fail') return 'error';
  if (s === 'warn') return 'warning';
  if (s === 'skip') return 'none';
  return 'note';
}

function buildLocations(uri: string, r: RuleResultEntry): SarifLocation[] {
  const locs = r.locations ?? [];
  if (locs.length === 0) {
    return [{ physicalLocation: { artifactLocation: { uri } } }];
  }
  return locs.map((l) => {
    const loc: SarifLocation = { physicalLocation: { artifactLocation: { uri } } };
    if (l.line !== undefined || l.col !== undefined || l.snippet) {
      loc.physicalLocation.region = {};
      if (l.line !== undefined) loc.physicalLocation.region.startLine = l.line;
      if (l.col !== undefined) loc.physicalLocation.region.startColumn = l.col;
      if (l.snippet) loc.physicalLocation.region.snippet = { text: l.snippet };
    }
    return loc;
  });
}

export function toSarif(report: AuditReport): string {
  const allResults = Object.values(report.categories).flatMap((c) => c.results);
  const seenRules = new Map<string, SarifRule>();
  const sarifResults: SarifResult[] = [];

  for (const r of allResults) {
    const id = r.stableId ?? r.id;
    if (!seenRules.has(id)) {
      const rule: SarifRule = {
        id,
        name: r.title,
        shortDescription: { text: r.title },
        fullDescription: { text: r.rationale },
        defaultConfiguration: { level: statusToLevel(r.status) === 'note' ? 'note' : statusToLevel(r.status) === 'error' ? 'error' : 'warning' },
        properties: {
          category: categoryOf(report, r.id),
          weight: r.weight,
          ...(r.impact ? { impact: r.impact } : {}),
          ...(r.effort ? { effort: r.effort } : {}),
        },
      };
      if (r.docsUrl) rule.helpUri = r.docsUrl;
      seenRules.set(id, rule);
    }
    if (r.status === 'fail' || r.status === 'warn') {
      const sr: SarifResult = {
        ruleId: id,
        level: statusToLevel(r.status),
        message: { text: r.fixHint ? `${r.rationale} — ${r.fixHint}` : r.rationale },
        locations: buildLocations(report.finalUrl, r),
        properties: {
          score: r.score,
          weight: r.weight,
          ...(r.impact ? { impact: r.impact } : {}),
          ...(r.effort ? { effort: r.effort } : {}),
          ...(r.estimatedImpact !== undefined ? { estimatedImpact: r.estimatedImpact } : {}),
        },
      };
      sarifResults.push(sr);
    }
  }

  const sarif = {
    $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
    version: '2.1.0',
    runs: [
      {
        tool: {
          driver: {
            name: 'geo-checker',
            version: report.version,
            informationUri: 'https://github.com/BaRam-OSS/geo-checker',
            rules: [...seenRules.values()],
          },
        },
        results: sarifResults,
        invocations: [
          {
            executionSuccessful: true,
            startTimeUtc: report.fetchedAt,
          },
        ],
      },
    ],
  };
  return JSON.stringify(sarif, null, 2);
}

function categoryOf(report: AuditReport, ruleId: string): string {
  for (const [cat, bucket] of Object.entries(report.categories)) {
    if (bucket.results.some((r) => r.id === ruleId)) return cat;
  }
  return 'unknown';
}
