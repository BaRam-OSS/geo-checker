# geo-checker

> Lighthouse-grade auditor for **Generative Engine Optimization (GEO)**. Measures how ready your site is to be found, understood, and cited by ChatGPT, Claude, Gemini, and Perplexity.

[![npm](https://img.shields.io/npm/v/geo-checker.svg)](https://www.npmjs.com/package/geo-checker)
[![license](https://img.shields.io/npm/l/geo-checker.svg)](./LICENSE)
[![CI](https://github.com/BaRam-OSS/geo-checker/actions/workflows/ci.yml/badge.svg)](https://github.com/BaRam-OSS/geo-checker/actions/workflows/ci.yml)

---

## Why

SEO tools tell you whether **Google** can rank your page. `geo-checker` tells you whether **AI search engines** can cite it. It inspects 25 on-page signals across four weighted categories and returns a 0–100 score per category — plus an interactive HTML report, prioritized Opportunities, and concrete fixes.

Inspired by Google Lighthouse, but built for GEO: AI-crawler robots rules, `llms.txt`, schema.org graph quality, citation signals.

## Install

```sh
# One-off
npx geo-checker https://example.com

# Or as a dev dependency
npm install --save-dev geo-checker
```

Requires Node.js **≥ 20.18.1**.

## Usage — CLI

```sh
# Pretty terminal output (with impact chips and timing)
geo-checker https://example.com

# Standalone interactive HTML report
geo-checker https://example.com --html report.html

# Write report.json + report.html side-by-side
geo-checker https://example.com --out ./reports

# JSON to stdout (for piping to jq, CI, etc.)
geo-checker https://example.com --json > report.json

# SPA / JS-rendered sites (requires optional playwright)
geo-checker https://example.com --render

# Filter to a single category or rule set
geo-checker https://example.com --category crawler
geo-checker https://example.com --only crawler.https,sd.required-fields

# CI mode — exit 1 on warn or fail
geo-checker https://example.com --fail-on warn
```

**All flags:**

| Flag | Description |
|---|---|
| `--json` | Emit JSON to stdout. |
| `--html <path>` | Write a self-contained HTML report to `<path>`. Use `-` for stdout. |
| `--out <dir>` | Write `report.json` + `report.html` to `<dir>` (directory is created if missing). |
| `--render` | Use headless Chromium via Playwright (optional dep). |
| `--category <names>` | Comma-separated: `crawler`, `structured-data`, `citation`, `content`. |
| `--only <ids>` | Comma-separated rule IDs (or stableIds) to run. |
| `--fail-on <level>` | `fail` (default) or `warn`. |
| `--timeout <ms>` | Per-request timeout (default 20 000). |

**Exit codes:** `0` success · `1` policy failure · `2` runtime error.

## The HTML report

`--html` produces a single, self-contained HTML file — no external CSS, fonts, or network calls. Open it in any browser. It mirrors the Lighthouse UX:

- **Score rings** for overall and each category.
- **Opportunities** section — ranked by the points you would recover by fixing each issue.
- **Diagnostics** — the remaining non-passing audits, grouped by category.
- **Passed audits** — collapsed by default.
- **Raw JSON** — copy-to-clipboard button for piping into other tools.

Auto-adapts to light/dark mode. ~60–80 KB for a typical page.

## Usage — Programmatic

```ts
import { audit } from 'geo-checker';

const report = await audit('https://example.com', { render: false });

console.log(report.overall);                       // 78
console.log(report.categories.crawler.score);      // 92
console.log(report.timing);                        // { fetchMs, auditMs, totalMs }
console.log(report.meta);                          // { toolVersion, nodeVersion, ... }
```

### Render an HTML or JSON report directly

```ts
import { audit } from 'geo-checker';
import { toHtml } from 'geo-checker/dist/reporters/html.js';
import { toJson } from 'geo-checker/dist/reporters/json.js';

const report = await audit('https://example.com');
await fs.writeFile('report.html', toHtml(report));
await fs.writeFile('report.json', toJson(report));
```

## What gets checked

| Category | Signals | Rules | Weight |
|---|---|---:|---:|
| **AI Crawler Access** | HTTPS, robots.txt reachability, AI-bot allow-lists (GPTBot, Google-Extended, ClaudeBot, PerplexityBot, CCBot, Amazonbot, anthropic-ai), `llms.txt`, sitemap.xml | 6 | 25 |
| **Structured Data** | JSON-LD presence & validity, recognised schema.org types, required-field coverage (Article, FAQPage, HowTo, Product, Organization, …), microdata/RDFa fallback, no duplicate primary types | 6 | 30 |
| **Citation Signals** | `<title>`, meta description, canonical, Open Graph, Twitter Card, `<html lang>`, author, publish/modified dates | 8 | 25 |
| **Content Structure** | single `<h1>`, heading hierarchy, image alt coverage, TL;DR / FAQ blocks, word count | 5 | 20 |

Every rule declares:

- **`stableId`** — frozen identifier for CI budgets (never renamed).
- **`impact`** — `critical` / `high` / `medium` / `low`.
- **`effort`** — `low` / `medium` / `high` (roughly how long the fix takes).
- **`group`** — `opportunity` (points you can recover) or `diagnostic` (binary signal).

See [`docs/rules.md`](./docs/rules.md) for every rule, why it matters for GEO, and how to fix a failure.

## Report schema

```ts
interface AuditReport {
  schemaVersion: 1;
  url: string;
  finalUrl: string;
  fetchedAt: string;
  renderMode: 'static' | 'rendered';
  overall: number;                                     // 0–100
  categories: Record<Category, CategoryReport>;
  warnings: string[];
  version: string;
  meta: { toolVersion: string; nodeVersion: string; userAgent?: string };
  timing: { fetchMs: number; auditMs: number; totalMs: number };
}
```

Each audit result carries `stableId`, `impact`, `effort`, `group`, `docsUrl`, and, where applicable, `estimatedImpact` (the points an Opportunity is worth).

## Extensibility

Add a custom rule:

```ts
import { audit, defineRule } from 'geo-checker';

const hasJsonFeed = defineRule({
  id: 'custom.has-json-feed',
  stableId: 'custom.has-json-feed',
  category: 'crawler',
  group: 'opportunity',
  weight: 2,
  impact: 'low',
  effort: 'low',
  title: 'JSON Feed present',
  description: 'Site should expose a JSON Feed at /feed.json',
  docsUrl: 'https://example.com/docs/json-feed',
  async run(ctx) {
    // ...your logic using ctx.$ / ctx.headers / ctx.robots, etc.
    return { status: 'pass', score: 1, rationale: 'JSON feed found' };
  },
});

const report = await audit('https://example.com', { extraRules: [hasJsonFeed] });
```

Custom rules are merged with the defaults and appear in every reporter automatically.

## CI recipe

```yaml
# .github/workflows/geo.yml
name: GEO audit
on: [push, pull_request]
jobs:
  geo:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npx -y geo-checker https://staging.example.com --fail-on warn --out ./geo
      - uses: actions/upload-artifact@v4
        with:
          name: geo-report
          path: ./geo
```

## Roadmap

| Version | Theme | Status |
|---|---|---|
| **v0.2** | Interactive HTML report · richer rule metadata (impact / effort / group / stableId) · timing & meta in the schema | ✅ Current |
| **v0.3** | `geo.config.*` configuration file · `--budget` CI assertions · AI-bot access matrix (GPTBot / ClaudeBot / PerplexityBot / Google-Extended / CCBot / Bingbot / OAI-SearchBot) | Next |
| **v1.0** | Multi-URL / sitemap batch · artifact bundles + `replay` command · schema freeze with JSON Schema | Planned |

## License

MIT © BaRam-OSS. See [LICENSE](./LICENSE).

## Contributing

PRs welcome — especially new rules, fixtures, and docs. See [CONTRIBUTING.md](./CONTRIBUTING.md).