# geo-checker rules reference

Every rule `geo-checker` runs is listed here. Each entry explains what the rule checks, why it matters for Generative Engine Optimization (GEO), and how to fix a failing result.

## Scoring model

- **Category weights:** `crawler` 25 · `structured-data` 30 · `citation` 25 · `content` 20 → sum to 100.
- **Rule scores** are 0..1 (partial credit allowed) and weighted within their category. Skipped rules are excluded from the denominator.
- **Overall** = weighted average of category scores, rounded to the nearest integer.

## Rule metadata

Every rule declares the following fields, surfaced in the HTML report, the CLI output, and the JSON schema:

| Field | Values | Purpose |
|---|---|---|
| `stableId` | frozen string | Pin rules across renames — use this in CI budgets and dashboards. |
| `group` | `opportunity` / `diagnostic` / `info` | `opportunity` = recoverable points (ranked by `estimatedImpact`). `diagnostic` = binary signal. |
| `impact` | `critical` / `high` / `medium` / `low` | Human-readable severity for UI prioritization. |
| `effort` | `low` / `medium` / `high` | Rough guess at how long the fix takes. |
| `weight` | integer 1–10 | Contributes to category scoring. |
| `docsUrl` | URL | Direct link to the remediation section of this document. |

The tables below list each rule with its four key annotations: **weight · impact · effort · group**.

---

## crawler  <span style="color:#9aa6b2">(category weight 25)</span>

### crawler.https
**weight 2 · impact critical · effort medium · diagnostic**

Fails if the final URL (after redirects) does not start with `https://`. AI crawlers increasingly skip plain HTTP pages.
**Fix:** terminate TLS at your CDN/origin and 301 every `http://` request to `https://`.

### crawler.robots-reachable
**weight 2 · impact low · effort low · diagnostic**

Warns if `/robots.txt` returns a non-2xx status. A reachable file — even an empty one — is the only way to explicitly signal policy.
**Fix:** serve a minimal `robots.txt` (`User-agent: *\nAllow: /\n`).

### crawler.robots-ai-allow
**weight 5 · impact critical · effort low · diagnostic**

Fails when any of **17 tracked AI crawlers** is disallowed from the audited path. Warns when none are explicitly mentioned. Tracked bots: GPTBot, OAI-SearchBot, ChatGPT-User, Google-Extended, Google-CloudVertexBot, ClaudeBot, anthropic-ai, Claude-Web, PerplexityBot, Applebot-Extended, Meta-ExternalAgent, Bytespider, DuckAssistBot, YouBot, cohere-ai, CCBot, Amazonbot.
**Fix:** add explicit `User-agent: <bot>` / `Allow: /` blocks (repeat for each bot you care about) instead of relying on the wildcard.

### crawler.llms-txt-present
**weight 4 · impact medium · effort medium · opportunity**

Warns if `/llms.txt` is missing. The file gives AI assistants a curated sitemap of your most citation-worthy pages.
**Fix:** publish an `llms.txt` at the site root that follows the [llms.txt draft spec](https://llmstxt.org/).

### crawler.llms-txt-wellformed
**weight 3 · impact medium · effort low · opportunity**

Validates the structure: needs an H1 project title, an optional summary paragraph/blockquote, then H2 sections containing `- [Title](url)` list items.
**Fix:** compare against the spec and re-serialize; avoid inline tables or HTML.

### crawler.sitemap-present
**weight 4 · impact high · effort low · diagnostic**

Warns if neither `/sitemap.xml` nor a `Sitemap:` directive in robots.txt points to a discoverable sitemap.
**Fix:** generate a sitemap during build; most frameworks ship this out of the box.

### crawler.llms-full-txt
**weight 2 · impact medium · effort medium · opportunity**

Warns if `/llms-full.txt` is missing or very short. The full-content mirror lets AI assistants ingest your top pages in one request instead of crawling each URL individually.
**Fix:** publish `/llms-full.txt` alongside `/llms.txt` containing the full body text of the pages worth citing. Build it at deploy-time from your CMS.

---

## structured-data  <span style="color:#9aa6b2">(category weight 30)</span>

### sd.jsonld-present
**weight 5 · impact critical · effort medium · diagnostic**

Fails if no `<script type="application/ld+json">` block is present.
**Fix:** add at least one JSON-LD block describing the primary entity of the page (Article, Product, Organization, etc.).

### sd.jsonld-valid-json
**weight 3 · impact high · effort low · diagnostic**

Fails if any JSON-LD block is not valid JSON (the browser silently ignores malformed blocks).
**Fix:** run your template output through `JSON.parse` in a test; stringify values server-side rather than hand-writing JSON.

### sd.schema-type-recognized
**weight 4 · impact high · effort low · diagnostic**

Warns if no `@type` in any block matches a common schema.org type (`Article`, `NewsArticle`, `BlogPosting`, `FAQPage`, `HowTo`, `Organization`, `Person`, `BreadcrumbList`, `Product`, `WebSite`, `WebPage`).
**Fix:** use the canonical type; AI engines train on the common vocabulary.

### sd.required-fields
**weight 6 · impact high · effort medium · opportunity**

Per-type field coverage check:

| Type | Required fields |
|---|---|
| Article / NewsArticle / BlogPosting | `headline`, `author`, `datePublished` |
| FAQPage | `mainEntity` (with `Question` → `Answer`) |
| HowTo | `name`, `step` |
| Product | `name`, `offers` |
| Organization | `name` |
| Person | `name` |
| BreadcrumbList | `itemListElement` |

**Fix:** add the missing field. If a field is legitimately unknown, change the `@type` to a less strict one (e.g. drop `Article` → `WebPage`).

### sd.microdata-fallback
**weight 2 · impact medium · effort medium · diagnostic**

Only checked when no JSON-LD exists. Fails when there is also no `itemscope itemtype` microdata and no RDFa `typeof` markup.
**Fix:** prefer JSON-LD; use microdata only when a CMS forces it.

### sd.no-duplicate-types
**weight 2 · impact medium · effort low · diagnostic**

Warns when the page declares more than one `Article`, `NewsArticle`, `BlogPosting`, `Product`, or `Organization` node — AI engines get confused about which is "the" entity.
**Fix:** consolidate into a single primary node, or connect them via `@id` + `isPartOf`.

### sd.sameas-entity
**weight 3 · impact high · effort medium · opportunity**

Looks at every `Organization`, `Person`, `LocalBusiness`, `Brand`, or `Corporation` node and checks for a `sameAs[]` array pointing at trusted knowledge-graph hosts (Wikipedia, Wikidata, LinkedIn, GitHub, Crunchbase, etc.). Two or more trusted links = full credit; one = partial; absent = warn.
**Fix:** add `"sameAs": ["https://en.wikipedia.org/wiki/...", "https://www.linkedin.com/company/..."]` to your Organization JSON-LD. AI engines use these links to resolve and trust the entity.

### sd.breadcrumb-valid
**weight 2 · impact medium · effort medium · opportunity**

Skipped unless a `BreadcrumbList` is present. Then validates that every `itemListElement` has `position` (1-indexed), `name`, and `item` (URL).
**Fix:** every breadcrumb item should look like `{ "@type": "ListItem", "position": 1, "name": "Home", "item": "https://example.com/" }`.

---

## citation  <span style="color:#9aa6b2">(category weight 25)</span>

### cit.title
**weight 2 · impact critical · effort low · diagnostic**

`<title>` must be 10–70 characters. Fails if missing; warns if too short or too long.
**Fix:** write a descriptive, specific title; avoid brand-only titles on content pages.

### cit.meta-description
**weight 2 · impact high · effort low · opportunity**

Warns if `meta[name=description]` is missing or outside 50–160 characters. AI snippets commonly quote it verbatim.
**Fix:** write one descriptive sentence per page.

### cit.canonical
**weight 3 · impact high · effort low · diagnostic**

Warns if no `<link rel="canonical">` is set. AI engines use the canonical URL as the shareable reference.
**Fix:** emit a canonical tag pointing at the preferred URL version (hostname, trailing slash, case).

### cit.og-tags
**weight 3 · impact high · effort low · opportunity**

Requires `og:title`, `og:type`, `og:url`, `og:image`. Missing any subset proportionally lowers the score.
**Fix:** fill in all four; `og:image` should be an absolute URL ≥1200×630 for best rendering.

### cit.twitter-card
**weight 2 · impact low · effort low · opportunity**

Warns if `twitter:card` is absent or if it's present but `twitter:title` is missing.
**Fix:** `<meta name="twitter:card" content="summary_large_image">` plus a matching `twitter:title`.

### cit.lang-attr
**weight 2 · impact medium · effort low · diagnostic**

Warns if `<html lang="...">` is not set. Helps AI engines route the page to the right-language surface.
**Fix:** always emit `<html lang="xx">` (e.g. `en`, `ko`, `ja`).

### cit.author-visible
**weight 4 · impact high · effort medium · opportunity**

Checks (in order) JSON-LD `author`, `meta[name=author]`, `rel="author"`, `.author` / `[itemprop="author"]` DOM. A DOM-only signal is still acceptable but scored lower.
**Fix:** add an `author` node to your JSON-LD — it doubles as E-E-A-T evidence.

### cit.dates
**weight 5 · impact high · effort low · opportunity**

Requires a publish or modified date via JSON-LD `datePublished`, `meta[property="article:published_time"]`, or `<time datetime="...">`. AI engines heavily prefer recent content.
**Fix:** include `datePublished` and update `dateModified` whenever you meaningfully revise.

### cit.content-freshness
**weight 3 · impact high · effort low · opportunity**

Skipped unless an Article-like JSON-LD is present (`Article`, `NewsArticle`, `BlogPosting`, `Report`, `TechArticle`). Passes when `dateModified` (or `datePublished` as fallback) is within 365 days; warns between 1–2 years; harder warn beyond 2 years.
**Fix:** when you revise an article, also bump `dateModified` to today's ISO date. Stale content is down-ranked in AI retrieval.

---

## content  <span style="color:#9aa6b2">(category weight 20)</span>

### cnt.single-h1
**weight 3 · impact high · effort low · diagnostic**

Fails if the page has zero `<h1>`; warns if more than one. A single H1 tells AI engines the primary topic.
**Fix:** keep exactly one H1 per page (logos usually don't need to be H1s).

### cnt.heading-hierarchy
**weight 3 · impact medium · effort medium · diagnostic**

Warns if headings skip a level (e.g. H2 → H4).
**Fix:** go H1 → H2 → H3 sequentially; use CSS to restyle if you need visual variance.

### cnt.image-alt
**weight 3 · impact medium · effort medium · opportunity**

Warns if fewer than 80% of `<img>` tags have non-empty `alt`. Alt text gives AI engines a textual anchor for visual content and is required for accessibility.
**Fix:** write descriptive alts; use `alt=""` only for purely decorative images.

### cnt.tldr-or-faq
**weight 5 · impact high · effort medium · opportunity**

Passes when a `FAQPage` JSON-LD exists or a `section[id*=tldr|summary|faq]` / `.tldr` / `.summary` / `.faq` selector is present.
**Fix:** add a short summary block at the top of long pages, or an explicit FAQ block for support content — this is the single highest-leverage content change.

### cnt.word-count
**weight 2 · impact high · effort high · opportunity**

Fails under 100 words of body text (script/style/nav/footer stripped). Warns under 300.
**Fix:** flesh out thin pages; AI engines rarely cite sub-100-word content.

### cnt.qa-structure
**weight 3 · impact high · effort medium · opportunity**

Passes when `FAQPage` JSON-LD is present, or when ≥2 H2/H3 headings are question-style. Recognises question marks (`?`/`？`), English interrogatives (`how`, `what`, `why`, `when`, `where`, `who`, `is`, `are`, `can`, `should`, `do`, `does`), and Korean interrogatives (`어떻게`, `왜`, `무엇`, `언제`, `어디`, `누가`, `어느`, `얼마`).
**Fix:** reframe 2+ H2 headings as real questions — e.g. "How do I audit a page?" — or add `FAQPage` JSON-LD. This materially improves answer-extraction odds.

### cnt.external-citations
**weight 2 · impact medium · effort medium · opportunity**

Counts distinct external hosts linked from `main/article/body` anchors, excluding `rel="nofollow"` / `rel="sponsored"` and subdomain self-references. ≥3 hosts = pass; 1–2 hosts = partial pass; 0 = warn.
**Fix:** cite at least one authoritative external source per article — a research paper, official docs, or news outlet — as an E-E-A-T signal.

---

## Summary table

| Rule | Category | Weight | Impact | Effort | Group |
|---|---|---:|---|---|---|
| crawler.https | crawler | 2 | critical | medium | diagnostic |
| crawler.robots-reachable | crawler | 2 | low | low | diagnostic |
| crawler.robots-ai-allow | crawler | 5 | critical | low | diagnostic |
| crawler.llms-txt-present | crawler | 4 | medium | medium | opportunity |
| crawler.llms-txt-wellformed | crawler | 3 | medium | low | opportunity |
| crawler.sitemap-present | crawler | 4 | high | low | diagnostic |
| crawler.llms-full-txt | crawler | 2 | medium | medium | opportunity |
| sd.jsonld-present | structured-data | 5 | critical | medium | diagnostic |
| sd.jsonld-valid-json | structured-data | 3 | high | low | diagnostic |
| sd.schema-type-recognized | structured-data | 4 | high | low | diagnostic |
| sd.required-fields | structured-data | 6 | high | medium | opportunity |
| sd.microdata-fallback | structured-data | 2 | medium | medium | diagnostic |
| sd.no-duplicate-types | structured-data | 2 | medium | low | diagnostic |
| sd.sameas-entity | structured-data | 3 | high | medium | opportunity |
| sd.breadcrumb-valid | structured-data | 2 | medium | medium | opportunity |
| cit.title | citation | 2 | critical | low | diagnostic |
| cit.meta-description | citation | 2 | high | low | opportunity |
| cit.canonical | citation | 3 | high | low | diagnostic |
| cit.og-tags | citation | 3 | high | low | opportunity |
| cit.twitter-card | citation | 2 | low | low | opportunity |
| cit.lang-attr | citation | 2 | medium | low | diagnostic |
| cit.author-visible | citation | 4 | high | medium | opportunity |
| cit.dates | citation | 5 | high | low | opportunity |
| cit.content-freshness | citation | 3 | high | low | opportunity |
| cnt.single-h1 | content | 3 | high | low | diagnostic |
| cnt.heading-hierarchy | content | 3 | medium | medium | diagnostic |
| cnt.image-alt | content | 3 | medium | medium | opportunity |
| cnt.tldr-or-faq | content | 5 | high | medium | opportunity |
| cnt.word-count | content | 2 | high | high | opportunity |
| cnt.qa-structure | content | 3 | high | medium | opportunity |
| cnt.external-citations | content | 2 | medium | medium | opportunity |

---

## Authoring your own rules

See [`CONTRIBUTING.md`](../CONTRIBUTING.md) for the plugin pattern and the full rule template including `stableId`, `group`, `impact`, `effort`, `docsUrl`, `fixHint`, `estimatedImpact`, and `locations[]`.