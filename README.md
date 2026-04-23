# geo-checker

> Lighthouse-style auditor for **Generative Engine Optimization (GEO)**. Checks how ready your site is to be cited by ChatGPT, Claude, Gemini, and Perplexity.

[![npm](https://img.shields.io/npm/v/geo-checker.svg)](https://www.npmjs.com/package/geo-checker)
[![license](https://img.shields.io/npm/l/geo-checker.svg)](./LICENSE)
[![CI](https://github.com/BaRam-OSS/geo-checker/actions/workflows/ci.yml/badge.svg)](https://github.com/BaRam-OSS/geo-checker/actions/workflows/ci.yml)

---

## Why

SEO tools check whether Google can rank your page. `geo-checker` checks whether **AI search engines** can find, understand, and cite it. It inspects 24 on-page signals across four categories and gives you a 0–100 score per category, plus concrete fix suggestions.

## Install

```sh
# One-off
npx geo-checker https://example.com

# Or as a dependency
npm install --save-dev geo-checker
```

Node.js 18 or later required.

## Usage — CLI

```sh
geo-checker https://example.com                       # pretty output
geo-checker https://example.com --json > report.json  # JSON output
geo-checker https://example.com --render              # use headless browser (SPA sites)
geo-checker https://example.com --category crawler    # run only one category
geo-checker https://example.com --only sd.required-fields
geo-checker https://example.com --fail-on warn        # CI mode (exit 1 on warn/fail)
```

Exit codes: `0` success · `1` policy failure · `2` runtime error.

## Usage — Programmatic

```ts
import { audit } from 'geo-checker';

const report = await audit('https://example.com', { render: false });
console.log(report.overall);            // 78
console.log(report.categories.crawler); // { score: 92, results: [...] }
```

## What gets checked

| Category | What it covers | Weight |
|---|---|---:|
| **AI Crawler Access** | HTTPS, robots.txt, AI bot allow-lists (GPTBot, Google-Extended, ClaudeBot, PerplexityBot, CCBot, Amazonbot), `llms.txt`, sitemap.xml | 25 |
| **Structured Data** | JSON-LD presence & validity, schema.org types (Article, FAQPage, HowTo, Organization, BreadcrumbList, Product), required fields | 30 |
| **Citation Signals** | title, meta description, canonical, Open Graph, Twitter Card, author, publish/modified dates, `lang` | 25 |
| **Content Structure** | single H1, heading hierarchy, image alt coverage, TL;DR/FAQ blocks, word count | 20 |

See [`docs/rules/`](./docs/rules/) for every individual rule and how to fix it.

## Extensibility

Add a custom rule:

```ts
import { audit, defineRule } from 'geo-checker';

const hasJsonFeed = defineRule({
  id: 'custom.has-json-feed',
  category: 'crawler',
  weight: 2,
  title: 'JSON Feed present',
  description: 'Site should expose a JSON Feed at /feed.json',
  async run(ctx) {
    // ...your logic
    return { status: 'pass', score: 1, rationale: 'JSON feed found' };
  },
});

await audit('https://example.com', { extraRules: [hasJsonFeed] });
```

## License

MIT © BaRam-OSS. See [LICENSE](./LICENSE).

## Contributing

PRs welcome. See [CONTRIBUTING.md](./CONTRIBUTING.md).
