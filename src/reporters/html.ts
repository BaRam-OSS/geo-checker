import type {
  AuditReport,
  Category,
  EvidenceLocation,
  Impact,
  RuleResultEntry,
  Status,
} from '../types.js';

const CATEGORY_LABELS: Record<Category, string> = {
  crawler: 'AI Crawler Access',
  'structured-data': 'Structured Data',
  citation: 'Citation Signals',
  content: 'Content Structure',
};

const IMPACT_ORDER: Record<Impact, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

function esc(s: unknown): string {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function scoreClass(score: number): 'good' | 'avg' | 'poor' {
  if (score >= 85) return 'good';
  if (score >= 60) return 'avg';
  return 'poor';
}

function ring(score: number, label: string, size = 128): string {
  const r = size / 2 - 8;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - score / 100);
  const cls = scoreClass(score);
  return `<div class="ring ring-${cls}">
    <svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" aria-hidden="true">
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" class="ring-track" />
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" class="ring-value"
        stroke-dasharray="${c.toFixed(2)}" stroke-dashoffset="${offset.toFixed(2)}" />
    </svg>
    <div class="ring-num">${score}</div>
    <div class="ring-label">${esc(label)}</div>
  </div>`;
}

function statusChip(status: Status): string {
  return `<span class="chip chip-${status}">${status}</span>`;
}

function impactChip(impact?: Impact): string {
  if (!impact) return '';
  return `<span class="chip chip-impact chip-impact-${impact}">impact: ${impact}</span>`;
}

function effortChip(effort?: string): string {
  if (!effort) return '';
  return `<span class="chip chip-effort">effort: ${esc(effort)}</span>`;
}

function locationBlock(locations?: EvidenceLocation[]): string {
  if (!locations || locations.length === 0) return '';
  const items = locations
    .map((loc) => {
      const parts: string[] = [];
      if (loc.selector) parts.push(`<code class="sel">${esc(loc.selector)}</code>`);
      if (loc.line !== undefined) parts.push(`line ${loc.line}${loc.col !== undefined ? `:${loc.col}` : ''}`);
      const head = parts.length > 0 ? `<div class="loc-head">${parts.join(' · ')}</div>` : '';
      const snippet = loc.snippet ? `<pre class="snippet">${esc(loc.snippet)}</pre>` : '';
      return `<li class="loc">${head}${snippet}</li>`;
    })
    .join('');
  return `<ul class="locations">${items}</ul>`;
}

function auditRow(r: RuleResultEntry): string {
  const impact = impactChip(r.impact);
  const effort = effortChip(r.effort);
  const est =
    r.estimatedImpact !== undefined
      ? `<span class="chip chip-est">est +${r.estimatedImpact}</span>`
      : '';
  const docs = r.docsUrl
    ? `<a class="docs" href="${esc(r.docsUrl)}" target="_blank" rel="noopener">docs ↗</a>`
    : '';
  const fixHint = r.fixHint ? `<div class="fix-hint">${esc(r.fixHint)}</div>` : '';
  const id = esc(r.stableId ?? r.id);
  const score = Math.round(r.score * 100);
  return `<div class="audit audit-${r.status}" data-stable-id="${id}">
    <div class="audit-head">
      ${statusChip(r.status)}
      <span class="audit-title">${esc(r.title)}</span>
      <span class="audit-score">${score}</span>
      ${impact}${effort}${est}
      ${docs}
    </div>
    <div class="audit-id"><code>${id}</code> · weight ${r.weight}${r.durationMs !== undefined ? ` · ${r.durationMs}ms` : ''}</div>
    <div class="audit-rationale">${esc(r.rationale)}</div>
    ${fixHint}
    ${locationBlock(r.locations)}
  </div>`;
}

function partitionResults(report: AuditReport): {
  opportunities: RuleResultEntry[];
  diagnostics: Record<Category, RuleResultEntry[]>;
  passed: Record<Category, RuleResultEntry[]>;
} {
  const opportunities: RuleResultEntry[] = [];
  const diagnostics: Record<Category, RuleResultEntry[]> = {
    crawler: [],
    'structured-data': [],
    citation: [],
    content: [],
  };
  const passed: Record<Category, RuleResultEntry[]> = {
    crawler: [],
    'structured-data': [],
    citation: [],
    content: [],
  };
  for (const cat of Object.keys(report.categories) as Category[]) {
    for (const r of report.categories[cat].results) {
      if (r.status === 'pass') {
        passed[cat].push(r);
      } else if (r.group === 'opportunity') {
        opportunities.push(r);
      } else {
        diagnostics[cat].push(r);
      }
    }
  }

  opportunities.sort((a, b) => {
    const ai = a.estimatedImpact ?? (1 - a.score) * a.weight;
    const bi = b.estimatedImpact ?? (1 - b.score) * b.weight;
    if (bi !== ai) return bi - ai;
    const aw = IMPACT_ORDER[a.impact ?? 'low'];
    const bw = IMPACT_ORDER[b.impact ?? 'low'];
    return bw - aw;
  });

  return { opportunities, diagnostics, passed };
}

function renderOpportunities(list: RuleResultEntry[]): string {
  if (list.length === 0) return '';
  return `<section class="section">
    <h2>Opportunities <span class="count">${list.length}</span></h2>
    <p class="section-hint">Highest-leverage fixes first — sorted by estimated points recovered.</p>
    <div class="audits">${list.map(auditRow).join('')}</div>
  </section>`;
}

function renderDiagnostics(groups: Record<Category, RuleResultEntry[]>): string {
  const total = Object.values(groups).reduce((n, arr) => n + arr.length, 0);
  if (total === 0) return '';
  const blocks = (Object.keys(groups) as Category[])
    .filter((c) => groups[c].length > 0)
    .map(
      (c) => `<div class="cat-block">
        <h3>${esc(CATEGORY_LABELS[c])} <span class="count">${groups[c].length}</span></h3>
        <div class="audits">${groups[c].map(auditRow).join('')}</div>
      </div>`,
    )
    .join('');
  return `<section class="section">
    <h2>Diagnostics <span class="count">${total}</span></h2>
    <p class="section-hint">More information about what's wrong, grouped by category.</p>
    ${blocks}
  </section>`;
}

function renderPassed(groups: Record<Category, RuleResultEntry[]>): string {
  const total = Object.values(groups).reduce((n, arr) => n + arr.length, 0);
  if (total === 0) return '';
  const blocks = (Object.keys(groups) as Category[])
    .filter((c) => groups[c].length > 0)
    .map(
      (c) => `<div class="cat-block">
        <h3>${esc(CATEGORY_LABELS[c])} <span class="count">${groups[c].length}</span></h3>
        <div class="audits">${groups[c].map(auditRow).join('')}</div>
      </div>`,
    )
    .join('');
  return `<section class="section">
    <details>
      <summary><h2 class="inline">Passed audits <span class="count">${total}</span></h2></summary>
      ${blocks}
    </details>
  </section>`;
}

function renderWarnings(warnings: string[]): string {
  if (warnings.length === 0) return '';
  const items = warnings.map((w) => `<li>${esc(w)}</li>`).join('');
  return `<section class="warnings"><ul>${items}</ul></section>`;
}

function renderRings(report: AuditReport): string {
  const catRings = (Object.keys(report.categories) as Category[])
    .filter((c) => report.categories[c].results.length > 0)
    .map((c) => ring(report.categories[c].score, CATEGORY_LABELS[c], 96))
    .join('');
  return `<section class="rings">
    <div class="rings-overall">${ring(report.overall, 'Overall', 160)}</div>
    <div class="rings-cats">${catRings}</div>
  </section>`;
}

function renderJsonBlock(report: AuditReport): string {
  const json = JSON.stringify(report, null, 2).replace(/<\/script/g, '<\\/script');
  return `<section class="section">
    <details>
      <summary><h2 class="inline">Report JSON</h2></summary>
      <p class="section-hint">The raw report, as emitted by <code>--json</code>.</p>
      <pre class="json-blob" id="geo-json">${esc(JSON.stringify(report, null, 2))}</pre>
    </details>
    <script type="application/json" id="geo-report-data">${json}</script>
  </section>`;
}

const STYLES = `
:root {
  color-scheme: light dark;
  --bg: #0b0d10;
  --panel: #141820;
  --panel-2: #1b2029;
  --border: #252b36;
  --fg: #e7ecf3;
  --fg-dim: #9aa6b2;
  --good: #17c27b;
  --avg: #f5b042;
  --poor: #ef476f;
  --accent: #5e9df8;
  --snippet: #0f1218;
}
@media (prefers-color-scheme: light) {
  :root {
    --bg: #fafbfc;
    --panel: #ffffff;
    --panel-2: #f3f5f9;
    --border: #e3e7ee;
    --fg: #1a222c;
    --fg-dim: #5a6572;
    --snippet: #f4f6fa;
  }
}
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
  font: 14px/1.55 ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  background: var(--bg);
  color: var(--fg);
}
.wrap { max-width: 1100px; margin: 0 auto; padding: 32px 24px 64px; }
header.hdr {
  display: flex; justify-content: space-between; align-items: flex-start; gap: 16px;
  padding-bottom: 24px; border-bottom: 1px solid var(--border);
}
.hdr-main h1 { font-size: 20px; margin: 0 0 6px; letter-spacing: -0.01em; }
.hdr-main h1 .brand { color: var(--fg-dim); font-weight: 500; }
.url { word-break: break-all; color: var(--fg); }
.hdr-meta { color: var(--fg-dim); font-size: 12px; margin-top: 8px; display: flex; gap: 14px; flex-wrap: wrap; }
.hdr-meta code { background: var(--panel-2); padding: 1px 6px; border-radius: 4px; }
.hdr-actions { display: flex; gap: 8px; }
.btn {
  background: var(--panel); color: var(--fg); border: 1px solid var(--border);
  padding: 6px 12px; border-radius: 6px; font: inherit; cursor: pointer;
}
.btn:hover { border-color: var(--accent); color: var(--accent); }

.rings {
  display: grid; grid-template-columns: auto 1fr; gap: 32px; align-items: center;
  margin: 28px 0 32px; padding: 24px; border-radius: 12px; background: var(--panel);
  border: 1px solid var(--border);
}
.rings-cats { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 16px; }
.ring { display: grid; justify-items: center; gap: 4px; position: relative; }
.ring svg { transform: rotate(-90deg); }
.ring-track { fill: none; stroke: var(--panel-2); stroke-width: 8; }
.ring-value { fill: none; stroke-width: 8; stroke-linecap: round; transition: stroke-dashoffset .5s ease; }
.ring-good .ring-value { stroke: var(--good); }
.ring-avg .ring-value { stroke: var(--avg); }
.ring-poor .ring-value { stroke: var(--poor); }
.ring-num {
  position: absolute; top: 50%; left: 50%; transform: translate(-50%, -65%);
  font-weight: 700; font-size: 28px; letter-spacing: -0.02em;
}
.rings-overall .ring-num { font-size: 44px; }
.ring-label { color: var(--fg-dim); font-size: 12px; }

.warnings {
  background: color-mix(in srgb, var(--avg) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--avg) 40%, var(--border));
  border-radius: 8px; padding: 12px 16px; margin-bottom: 24px;
}
.warnings ul { margin: 0; padding-left: 20px; }

.section { margin: 28px 0; }
.section h2 { font-size: 18px; margin: 0 0 6px; letter-spacing: -0.01em; }
.section .section-hint { color: var(--fg-dim); font-size: 13px; margin: 0 0 14px; }
.section h2.inline { display: inline-block; margin: 0; cursor: pointer; }
details > summary { list-style: none; cursor: pointer; }
details > summary::-webkit-details-marker { display: none; }
details > summary::before { content: "▸ "; color: var(--fg-dim); }
details[open] > summary::before { content: "▾ "; }

.count {
  display: inline-block; background: var(--panel-2); color: var(--fg-dim);
  font-size: 11px; padding: 1px 8px; border-radius: 999px; margin-left: 6px; vertical-align: middle;
}

.cat-block { margin: 14px 0; }
.cat-block h3 { font-size: 14px; color: var(--fg-dim); font-weight: 600; margin: 18px 0 8px; }

.audits { display: grid; gap: 10px; }
.audit {
  background: var(--panel); border: 1px solid var(--border); border-radius: 10px;
  padding: 12px 14px;
}
.audit-fail { border-left: 3px solid var(--poor); }
.audit-warn { border-left: 3px solid var(--avg); }
.audit-skip { opacity: 0.7; }
.audit-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.audit-title { font-weight: 600; flex: 1 1 auto; min-width: 0; }
.audit-score { color: var(--fg-dim); font-variant-numeric: tabular-nums; font-size: 12px; }
.audit-id { color: var(--fg-dim); font-size: 11px; margin-top: 4px; }
.audit-id code { background: transparent; color: var(--fg-dim); }
.audit-rationale { margin-top: 8px; color: var(--fg); }
.fix-hint { margin-top: 6px; color: var(--accent); font-size: 13px; }
.docs { color: var(--accent); text-decoration: none; font-size: 12px; margin-left: auto; }
.docs:hover { text-decoration: underline; }

.chip {
  display: inline-block; font-size: 11px; padding: 1px 8px; border-radius: 999px;
  border: 1px solid var(--border); background: var(--panel-2); color: var(--fg-dim);
  text-transform: lowercase; letter-spacing: 0.02em;
}
.chip-pass { color: var(--good); border-color: color-mix(in srgb, var(--good) 40%, var(--border)); }
.chip-warn { color: var(--avg); border-color: color-mix(in srgb, var(--avg) 40%, var(--border)); }
.chip-fail { color: var(--poor); border-color: color-mix(in srgb, var(--poor) 40%, var(--border)); }
.chip-impact-critical, .chip-impact-high { color: var(--poor); border-color: color-mix(in srgb, var(--poor) 40%, var(--border)); }
.chip-impact-medium { color: var(--avg); border-color: color-mix(in srgb, var(--avg) 40%, var(--border)); }
.chip-est { color: var(--accent); border-color: color-mix(in srgb, var(--accent) 40%, var(--border)); }

.locations { list-style: none; padding: 0; margin: 10px 0 0; display: grid; gap: 6px; }
.loc { border: 1px solid var(--border); border-radius: 6px; padding: 6px 8px; background: var(--panel-2); }
.loc-head { color: var(--fg-dim); font-size: 12px; }
.loc-head .sel { background: transparent; color: var(--accent); padding: 0; }
.snippet, .json-blob {
  font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace; font-size: 12px;
  background: var(--snippet); padding: 10px 12px; border-radius: 6px;
  white-space: pre-wrap; word-break: break-word; margin: 6px 0 0; max-height: 320px; overflow: auto;
}
.json-blob { max-height: 480px; }

footer.ftr {
  margin-top: 48px; padding-top: 16px; border-top: 1px solid var(--border);
  color: var(--fg-dim); font-size: 12px; display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap;
}
`;

const SCRIPT = `
(function () {
  var btn = document.getElementById('copy-json');
  var data = document.getElementById('geo-report-data');
  if (!btn || !data) return;
  btn.addEventListener('click', function () {
    var payload = data.textContent || '';
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(payload).then(function () {
        btn.textContent = 'Copied ✓';
        setTimeout(function () { btn.textContent = 'Copy JSON'; }, 1200);
      }).catch(function () { fallback(); });
    } else { fallback(); }
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = payload; document.body.appendChild(ta);
      ta.select(); try { document.execCommand('copy'); } catch (e) {}
      document.body.removeChild(ta);
      btn.textContent = 'Copied ✓';
      setTimeout(function () { btn.textContent = 'Copy JSON'; }, 1200);
    }
  });
})();
`;

export function toHtml(report: AuditReport): string {
  const { opportunities, diagnostics, passed } = partitionResults(report);
  const title = `geo-checker · ${esc(report.finalUrl)}`;
  const timingLine = `fetch ${report.timing.fetchMs}ms · audit ${report.timing.auditMs}ms · total ${report.timing.totalMs}ms`;

  const body = `<div class="wrap">
    <header class="hdr">
      <div class="hdr-main">
        <h1><span class="brand">geo-checker</span> · <span class="url">${esc(report.finalUrl)}</span></h1>
        <div class="hdr-meta">
          <span>mode: <code>${esc(report.renderMode)}</code></span>
          <span>fetched: <code>${esc(report.fetchedAt)}</code></span>
          <span>tool: <code>v${esc(report.meta.toolVersion)}</code></span>
          <span>node: <code>${esc(report.meta.nodeVersion)}</code></span>
          <span>${timingLine}</span>
        </div>
      </div>
      <div class="hdr-actions">
        <button class="btn" id="copy-json" type="button">Copy JSON</button>
      </div>
    </header>

    ${renderRings(report)}
    ${renderWarnings(report.warnings)}
    ${renderOpportunities(opportunities)}
    ${renderDiagnostics(diagnostics)}
    ${renderPassed(passed)}
    ${renderJsonBlock(report)}

    <footer class="ftr">
      <span>Generated by geo-checker v${esc(report.meta.toolVersion)}</span>
      <span>Schema v${report.schemaVersion}</span>
    </footer>
  </div>`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="generator" content="geo-checker v${esc(report.meta.toolVersion)}" />
<title>${title}</title>
<style>${STYLES}</style>
</head>
<body>
${body}
<script>${SCRIPT}</script>
</body>
</html>
`;
}
