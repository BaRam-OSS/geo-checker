# geo-checker rules reference

Every rule `geo-checker` runs is listed here. Each entry links to a section where you can read what the rule checks, why it matters for Generative Engine Optimization (GEO), and how to fix a failing result. The category weights combine into a 0–100 overall score.

**Category weights:** `crawler` 25 · `structured-data` 30 · `citation` 25 · `content` 20.

---

## crawler

### crawler.https
Weight: 2. Fails if the final URL (after redirects) does not start with `https://`. AI crawlers increasingly skip plain HTTP pages. **Fix:** terminate TLS at your CDN/origin and 301 every `http://` request to `https://`.

### crawler.robots-reachable
Weight: 2. Warns if `/robots.txt` returns a non-2xx status. A reachable file — even an empty one — is the only way to explicitly signal policy. **Fix:** serve a minimal `robots.txt` (`User-agent: *\nAllow: /\n`).

### crawler.robots-ai-allow
Weight: 5. Fails when any of GPTBot, Google-Extended, ClaudeBot, PerplexityBot, CCBot, Amazonbot, or anthropic-ai is disallowed from the audited path. Warns when none of them are mentioned. **Fix:** add explicit `User-agent: GPTBot` / `Allow: /` blocks (repeat for each bot) instead of relying on the wildcard.

### crawler.llms-txt-present
Weight: 4. Warns if `/llms.txt` is missing. The file gives AI assistants a curated sitemap of your most citation-worthy pages. **Fix:** publish an `llms.txt` at the site root that follows the [llms.txt draft spec](https://llmstxt.org/).

### crawler.llms-txt-wellformed
Weight: 3. Validates the structure: needs an H1 project title, an optional summary paragraph/blockquote, then H2 sections containing `- [Title](url)` list items. **Fix:** compare against the spec and re-serialize; avoid inline tables or HTML.

### crawler.sitemap-present
Weight: 4. Warns if neither `/sitemap.xml` nor a `Sitemap:` directive in robots.txt points to a discoverable sitemap. **Fix:** generate a sitemap during build; most frameworks ship this out of the box.

---

## structured-data

### sd.jsonld-present
Weight: 5. Fails if no `<script type="application/ld+json">` block is present. **Fix:** add at least one JSON-LD block describing the primary entity of the page (Article, Product, Organization, etc.).

### sd.jsonld-valid-json
Weight: 3. Fails if any JSON-LD block is not valid JSON (the browser silently ignores malformed blocks). **Fix:** run your template output through `JSON.parse` in a test; stringify values server-side rather than hand-writing JSON.

### sd.schema-type-recognized
Weight: 4. Warns if no `@type` in any block matches a common schema.org type (`Article`, `NewsArticle`, `BlogPosting`, `FAQPage`, `HowTo`, `Organization`, `Person`, `BreadcrumbList`, `Product`, `WebSite`, `WebPage`). **Fix:** use the canonical type; AI engines train on the common vocabulary.

### sd.required-fields
Weight: 6. Per-type field coverage check:

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
Weight: 2. Only checked when no JSON-LD exists. Fails when there is also no `itemscope itemtype` microdata and no RDFa `typeof` markup. **Fix:** prefer JSON-LD; use microdata only when a CMS forces it.

### sd.no-duplicate-types
Weight: 2. Warns when the page declares more than one `Article`, `NewsArticle`, `BlogPosting`, `Product`, or `Organization` node — AI engines get confused about which is "the" entity. **Fix:** consolidate into a single primary node, or connect them via `@id` + `isPartOf`.

---

## citation

### cit.title
Weight: 2. `<title>` must be 10–70 characters. Fails if missing; warns if too short or too long. **Fix:** write a descriptive, specific title; avoid brand-only titles on content pages.

### cit.meta-description
Weight: 2. Warns if `meta[name=description]` is missing or outside 50–160 characters. AI snippets commonly quote it verbatim. **Fix:** write one descriptive sentence per page.

### cit.canonical
Weight: 3. Warns if no `<link rel="canonical">` is set. AI engines use the canonical URL as the shareable reference. **Fix:** emit a canonical tag pointing at the preferred URL version (hostname, trailing slash, case).

### cit.og-tags
Weight: 3. Requires `og:title`, `og:type`, `og:url`, `og:image`. Missing any subset proportionally lowers the score. **Fix:** fill in all four; `og:image` should be an absolute URL ≥1200×630 for best rendering.

### cit.twitter-card
Weight: 2. Warns if `twitter:card` is absent or if it's present but `twitter:title` is missing. **Fix:** `<meta name="twitter:card" content="summary_large_image">` plus a matching `twitter:title`.

### cit.lang-attr
Weight: 2. Warns if `<html lang="...">` is not set. Helps AI engines route the page to the right-language surface. **Fix:** always emit `<html lang="xx">` (e.g. `en`, `ko`, `ja`).

### cit.author-visible
Weight: 4. Checks (in order) JSON-LD `author`, `meta[name=author]`, `rel="author"`, `.author` / `[itemprop="author"]` DOM. A DOM-only signal is still acceptable but scored lower. **Fix:** add an `author` node to your JSON-LD — it doubles as E-E-A-T evidence.

### cit.dates
Weight: 5. Requires a publish or modified date via JSON-LD `datePublished`, `meta[property="article:published_time"]`, or `<time datetime="...">`. AI engines heavily prefer recent content. **Fix:** include `datePublished` and update `dateModified` whenever you meaningfully revise.

---

## content

### cnt.single-h1
Weight: 3. Fails if the page has zero `<h1>`; warns if more than one. A single H1 tells AI engines the primary topic. **Fix:** keep exactly one H1 per page (logos usually don't need to be H1s).

### cnt.heading-hierarchy
Weight: 3. Warns if headings skip a level (e.g. H2 → H4). **Fix:** go H1 → H2 → H3 sequentially; use CSS to restyle if you need visual variance.

### cnt.image-alt
Weight: 3. Warns if fewer than 80% of `<img>` tags have non-empty `alt`. Alt text gives AI engines a textual anchor for visual content and is required for accessibility. **Fix:** write descriptive alts; use `alt=""` only for purely decorative images.

### cnt.tldr-or-faq
Weight: 5. Passes when a `FAQPage` JSON-LD exists or a `section[id*=tldr|summary|faq]` / `.tldr` / `.summary` / `.faq` selector is present. **Fix:** add a short summary block at the top of long pages, or an explicit FAQ block for support content — this is the single highest-leverage content change.

### cnt.word-count
Weight: 2. Fails under 100 words of body text (script/style/nav/footer stripped). Warns under 300. **Fix:** flesh out thin pages; AI engines rarely cite sub-100-word content.

---

## Authoring your own rules

See [`CONTRIBUTING.md`](../CONTRIBUTING.md) for the plugin pattern.
