# Changelog

All notable changes to this project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project adheres to [Semantic Versioning](https://semver.org/).

## [0.5.3] — 2026-10-21

### Docs

- README links the hosted version of the same audit (BaRam free GEO audit) and the research behind some rules. No code changes.

## [0.5.2] — 2026-10-18

### Fixed

- **`crawler.robots-ai-allow` penalised sites that block nothing.** Crawlers that a robots.txt does not name are allowed by default (RFC 9309), yet the rule scored a wildcard-only file 0.6 and a missing robots.txt 0.5 because no AI bot was listed by name. Listing a bot does not change what it may crawl, so neither case is a defect. Both now pass. The rule fails only when a tracked crawler is actually disallowed, and the score still drops by the share of blocked bots. In a sample of 185 audited sites, 162 lost points this way while only 5 blocked an AI crawler.

## [0.5.1] — 2026-10-11

### Security

- **`publicOnly` option (SSRF protection for hosted use).** `audit(url, { publicOnly: true })` refuses to fetch anything that is not on the public internet: the page itself, every redirect hop, `robots.txt`, `llms.txt`, and the sitemap named in `robots.txt`. Previously a service auditing user-submitted URLs could only validate the first URL; the target could answer the pre-check normally and then `302` the audit to `http://127.0.0.1/` or a cloud metadata address, and the fetched content would end up in the report. The check now happens where the connection is made — IP-literal hosts and non-http schemes are rejected per hop, and DNS answers pointing at loopback, private, link-local, CGNAT, or IPv4-mapped/NAT64 addresses are refused at connect time, which also closes DNS rebinding. Off by default so the CLI can still audit `localhost` during development. Cannot be combined with `render`.

## [0.5.0] — 2026-09-05

The `content` category was entirely structural — H1 count, heading order, alt text, word count. The 2026 GEO survey ([arXiv 2607.14035](https://arxiv.org/abs/2607.14035)) classifies pure formatting changes as having **weak effects** ("Test headings, tables, and fields without assuming the direction of effect") while reporting extractable evidence as the strongest content-side lever. This release measures the evidence.

### Added

- `cnt.dated-statistics` (weight 4, high impact) — counts statistics that carry a **time reference in the same sentence**, and separately notes how many also name a source. Rationale: the survey requires evidence be "relevant, verifiable, **dated**, and properly attributed"; the original GEO paper (Aggarwal et al., KDD'24) reports Statistics Addition at a 25.2% position-adjusted word count share (+30.6% relative). Counting bare numbers would reward the fabricated-statistic failure mode the survey explicitly warns about, so an undated number does not count.
- `cnt.quotations` (weight 3, high impact) — attributed quotations, counting both `<blockquote>` and quoted phrases (Korean pages routinely quote without `<blockquote>`). Rationale: quotation addition is the **largest single content-side effect** reported — ~41% relative gain in position-adjusted word count (27.2% vs 19.3%). Attribution is required, not optional: an unattributed quote is a sentence, not evidence.

### Fixed

- **`aeo.token-length` badly underestimated CJK.** It used `text.length / 3` for every script. Korean runs roughly 1–1.5 tokens per character under modern BPE tokenizers while English runs ~4 characters per token, so Korean pages were under-counted by 3–4× and pages well over the 15K limit passed as "within range". Now estimated per script.

### Note

Deliberately **not** added: more formatting rules. The survey's caution is explicit — "formatting changes alone have weak effects", and body-only optimization can *reduce* upstream retrieval (top-20 presence −9%, top-10 after reranking −16%). Adding structural checks would have made the score easier to game and less predictive.

## [0.4.0] — 2026-09-04

Indexability first. Every check in this tool scores whatever HTML came back — but nothing verified that the HTML was the real page, or that the page was allowed to be indexed at all. A page declaring `noindex` could score 95.

### Added

- **3 new rules** (registry grows from 34 → 37), all in `crawler`:
  - `crawler.http-status` (weight 5) — asserts a successful status and flags bot-challenge pages served as 200. A 403/429 means AI crawlers hit the same wall, and every other check below ran against an error page.
  - `crawler.meta-robots` (weight 5) — page-level `<meta name="robots">`, including per-bot variants (`googlebot`, …). Catches `noindex`, `noai`/`noimageai`, `nosnippet`.
  - `crawler.x-robots-tag` (weight 4) — the same directives delivered as an HTTP header, invisible in the HTML and independent of robots.txt. `ctx.headers` was collected since 0.1 but no rule ever read it.

### Fixed

- **`report.version` now reports the real package version.** It was hard-coded to `'0.3.0'` in `engine.ts` and never bumped, so every report produced by 0.3.1 and 0.3.2 claimed to be 0.3.0. Stored reports could not be attributed to a ruleset.
- **User-Agent no longer claims `geo-checker/0.1.0`.** It is derived from `package.json`, so target-site logs show which version actually visited.

### Note on score comparability

Scores from 0.4.0 are **not directly comparable** to earlier versions. The three new rules pass on any correctly-served page, so a well-configured site gains a few points, while a site that blocks indexing now loses a large share of the `crawler` category. Category weights are unchanged from 0.3.2.

## [0.3.2] — 2026-08

### Added

- **`aeo` category** (weight 20) with 3 rules: `aeo.skill-md`, `aeo.agent-permissions`, `aeo.token-length`. `AuditContext` gains `skillMd` and `agentPermissions`; `buildContext` fetches two more root files.

### Changed

- `CATEGORY_WEIGHTS` rebalanced to make room for `aeo`: crawler 25→20, structured-data 30→25, citation 25→20, content 20→15. **0.3.2 scores are not comparable to 0.3.1 scores for the same site**, even ignoring the new rules.

## [0.3.1] — 2026-05

### Added

- **Korean localisation.** `title_ko` on every `Rule`, `rationale_ko` on every `RuleResult` / `RuleResultEntry`, populated on all return paths of all 31 rules. No new rules and no scoring change. Reports stored before this version have no `_ko` fields and fall back to English.

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