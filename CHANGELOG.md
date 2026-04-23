# Changelog

All notable changes to this project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project adheres to [Semantic Versioning](https://semver.org/).

## [0.3.0] — 2026-04-23

v0.3 is the **"GEO Intelligence"** milestone: deeper coverage of the signals AI engines actually rank on, plus the workflow integrations needed to plug geo-checker into CI. Backwards-compatible — `schemaVersion` stays at `1`, every existing stableId is unchanged, all new fields are optional.

### Added

- **6 new rules** (registry grows from 25 → 31):
  - `crawler.llms-full-txt` — checks for `/llms-full.txt`, the full-content mirror that lets AI assistants ingest the corpus in one request.
  - `sd.sameas-entity` — Organization/Person nodes should declare `sameAs[]` linking to Wikipedia/Wikidata/LinkedIn (E-E-A-T entity-graph signal).
  - `sd.breadcrumb-valid` — when a `BreadcrumbList` is present, every `itemListElement` must declare `position`, `name`, and `item`.
  - `cit.content-freshness` — `dateModified` within 1 year on Article-like JSON-LD; warns on stale (>2y) content.
  - `cnt.qa-structure` — question-style H2/H3 headings (or `FAQPage` JSON-LD) for answer extraction. Recognises English and Korean question patterns.
  - `cnt.external-citations` — outbound links to authoritative external sources (E-E-A-T trust signal). Excludes `nofollow`/`sponsored`.
- **Expanded AI bot registry** — `crawler.robots-ai-allow` now tracks **17 crawlers** (up from 7): GPTBot, OAI-SearchBot, ChatGPT-User, Google-Extended, Google-CloudVertexBot, ClaudeBot, anthropic-ai, Claude-Web, PerplexityBot, Applebot-Extended, Meta-ExternalAgent, Bytespider, DuckAssistBot, YouBot, cohere-ai, CCBot, Amazonbot. stableId unchanged.
- **CSV reporter** (`--csv <path>`) — flat tabular export, one row per rule result, ready for BI dashboards.
- **Markdown reporter** (`--md <path>`) — PR-comment template with shields.io score badges and an issue table. Pipe straight into `gh pr comment --body-file`.
- **SARIF 2.1.0 reporter** (`--sarif <path>`) — for GitHub Code Scanning ingestion.
- **Baseline diff** (`--baseline <prev.json>`) — prints per-category deltas, regressions, fixes, and new failures alongside the regular report.
- **Config file** — auto-discovers `geo-checker.config.{json,mjs,js}` (or pass `--config <path>`). Supports rule disable/enable, per-rule weight overrides, category weight overrides, and `extraRules`.
- **Batch mode** — new `geo-checker batch <file>` sub-command. Reads URLs (one per line, `#` comments OK), audits with configurable `--concurrency`, writes per-URL `<slug>.json`/`<slug>.html`, plus an aggregated `summary.json`. Per-URL failures are isolated.
- **JSON Schema** — published at `schema/audit-report.schema.json` (also bundled in the npm package).
- **AuditContext.llmsFullTxt** — new field exposing `/llms-full.txt` raw contents to rules and consumers.

### Changed

- Package version bumped to `0.3.0`.
- `audit()` now accepts `config: GeoConfig` and `configPath: string` — both optional and additive.
- `runRules()` now accepts `categoryWeights` for config-driven category-weight overrides.

### Internal

- New tests: 6 per-rule suites, 4 new reporter suites, batch runner, and config loader. Suite grew from 57 → 100+.
- New module exports: `runBatch`, `summaryToJson`, `urlToSlug`, `toCsv`, `toMarkdown`, `toSarif`, `diffReports`, `formatDiffLine`, `loadConfig`, `findConfig`, `applyConfig`, plus `GeoConfig` / `RuleOverride` / batch / diff types.

## [0.2.0] — 2026-04-23

v0.2 is the **"Lighthouse-grade reporting"** milestone. Every addition is backwards-compatible with v0.1: existing CLI flags, JSON output, and programmatic `audit()` calls still work unchanged. New fields are additive.

### Added

- **Interactive HTML report** — new `--html <path>` flag (use `-` for stdout) and `--out <dir>` flag (writes `report.json` + `report.html` together). The report is a single self-contained HTML file with:
  - Score rings for the overall score and each category (inline SVG, auto dark/light theme).
  - **Opportunities** section ranked by recoverable points (`estimatedImpact`).
  - **Diagnostics** section grouped by category.
  - Collapsed **Passed audits** section.
  - Inline evidence snippets (when rules provide `locations[]`).
  - "Copy JSON" button and an embedded raw-JSON block for round-tripping.
  - Zero external network calls, ~60–80 KB per report.
- **Rule metadata** (`src/types.ts`) — every `Rule` can now declare:
  - `stableId` — frozen identifier for CI budgets and external tooling.
  - `group` — `opportunity` | `diagnostic` | `info`.
  - `impact` — `critical` | `high` | `medium` | `low`.
  - `effort` — `low` | `medium` | `high`.
  - `docsUrl` — direct link to remediation docs.
- **Result metadata** — `RuleResult` can now include `locations[]` (DOM selector, line, column, snippet), `fixHint`, and `estimatedImpact` (points recoverable).
- **Report schema** — `AuditReport` now includes:
  - `schemaVersion: 1` (pinned for future compatibility).
  - `meta: { toolVersion, nodeVersion, userAgent?, configPath? }`.
  - `timing: { fetchMs, auditMs, totalMs }`.
  - Each result entry carries propagated `stableId`, `group`, `impact`, `effort`, `docsUrl`, and `durationMs`.
- **CLI reporter** — impact chips (`[crit]`, `[high]`, `[med]`, `[low]`) inline with rationales; opportunity-point hints (`+N`); per-phase timing in the header line.
- **`--only` filter** now matches both `id` and `stableId` so CI configs keep working across rule renames.
- All 25 default rules backfilled with `stableId`, `group`, `impact`, `effort`, and `docsUrl` — the v0.2 stableIds are the v1.0 frozen contract.

### Changed

- Package version bumped to `0.2.0`.
- The default CLI output now includes a timing summary (`fetch Xms, audit Yms, total Zms`) and impact chips per audit row.

### Internal

- Test suite grew from ~20 to 57 tests. New: engine timing/meta/schema propagation, rule-metadata registry invariants (every rule must declare the new fields; stableIds must be unique), HTML reporter escaping and JSON-round-trip coverage.

## [0.1.0] — 2026-04

Initial public release.

### Added

- **24 rules** across four weighted categories:
  - `crawler` (25): https, robots-reachable, robots-ai-allow (GPTBot/Google-Extended/ClaudeBot/PerplexityBot/CCBot/Amazonbot/anthropic-ai), llms-txt-present, llms-txt-wellformed, sitemap-present
  - `structured-data` (30): jsonld-present, jsonld-valid-json, schema-type-recognized, required-fields (Article/FAQPage/HowTo/Product/Organization/BreadcrumbList/Person), microdata-fallback, no-duplicate-types
  - `citation` (25): title, meta-description, canonical, og-tags, twitter-card, lang-attr, author-visible, dates
  - `content` (20): single-h1, heading-hierarchy, image-alt, tldr-or-faq, word-count
- **CLI** (`npx geo-checker <url>`) with pretty and `--json` output, `--category` / `--only` filters, `--fail-on warn|fail`, `--timeout`.
- **Programmatic API**: `audit(url, options)` returns a structured `AuditReport`; `defineRule()` + `extraRules` for user plugins.
- **Static fetching** via undici with manual redirect handling (up to 5 hops) and a 20 s default timeout.
- **Optional `--render` mode** powered by playwright (declared as an optional dependency; not pulled in unless the flag is used).
- **SPA detection**: when a page has <500 chars of body text plus a SPA root element, the report surfaces a `warnings` entry suggesting `--render`.
- MIT License. Dual CJS + ESM build via tsup. Node ≥20.18.1 (cheerio 1.1+ requirement).