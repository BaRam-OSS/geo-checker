# Changelog

All notable changes to this project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project adheres to [Semantic Versioning](https://semver.org/).

## [0.1.0] — Unreleased

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
