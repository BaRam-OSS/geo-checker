# Contributing to geo-checker

Thanks for your interest. This project welcomes new rules, bug fixes, and documentation improvements.

## Quick start

```sh
pnpm install
pnpm lint        # eslint
pnpm typecheck   # tsc --noEmit
pnpm test        # vitest
pnpm build       # tsup (CJS + ESM + .d.ts)
```

Node ≥ **20.18.1** is required.

## Adding a rule

1. Create a file at `src/rules/<category>/<rule-id>.ts`.
2. Export a `Rule` using `defineRule()` (from `src/types.ts`). Keep the rule pure — it receives an `AuditContext` and returns a `RuleResult`.
3. Register the rule in `src/rules/<category>/index.ts` and via the top-level aggregator `src/rules/index.ts`.
4. Add a unit test in `test/rules.test.ts` (or a dedicated file under `test/rules/`). Fixtures live under `test/fixtures/` when a full HTML sample is needed.
5. Add documentation in [`docs/rules.md`](./docs/rules.md) — include the rule's weight, impact, effort, and how to fix a failure. The URL fragment (`#<id>`) becomes the `docsUrl`.

### Rule template

```ts
import { defineRule } from '../../types.js';

export const myRule = defineRule({
  id: 'crawler.my-rule',                   // public CLI/JSON identifier
  stableId: 'crawler.my-rule',             // frozen identifier for CI budgets — never rename
  category: 'crawler',                     // 'crawler' | 'structured-data' | 'citation' | 'content'
  group: 'diagnostic',                     // 'opportunity' (recoverable points) | 'diagnostic' (binary signal)
  weight: 3,                               // 1–10; larger = bigger real-world impact
  impact: 'high',                          // 'critical' | 'high' | 'medium' | 'low'
  effort: 'low',                           // 'low' | 'medium' | 'high' — how long the fix takes
  docsUrl: 'https://github.com/BaRam-OSS/geo-checker/blob/main/docs/rules.md#crawlermy-rule',
  title: 'Short human-readable title',
  description: 'One sentence on why this signal matters for GEO.',
  run(ctx) {
    if (/* check passes */ true) {
      return { status: 'pass', score: 1, rationale: 'Everything is in order.' };
    }
    return {
      status: 'warn',                      // 'pass' | 'warn' | 'fail' | 'skip'
      score: 0.5,                          // 0..1 (partial credit is fine)
      rationale: 'What is wrong in ≤200 chars.',
      fixHint: 'One-line remediation to show inline.',
      estimatedImpact: 6,                  // points recoverable — enables Opportunity ranking
      locations: [                         // optional DOM-level evidence
        { selector: 'head > link[rel="canonical"]', snippet: '<link rel="canonical" href="">' },
      ],
    };
  },
});
```

### `group` guide

- **`opportunity`** — the rule can return partial credit and every point you recover improves the score. Set `estimatedImpact` so the HTML report can rank opportunities correctly. Examples: `cit.meta-description`, `sd.required-fields`, `cnt.word-count`.
- **`diagnostic`** — a binary "is this set?" signal. The rule passes or fails outright. Examples: `crawler.https`, `cit.title`, `cnt.single-h1`.
- **`info`** — reserved for purely informational rules that should not affect the score (not used by default rules yet).

## Rule design principles

- **Fail fast, explain why.** Every `RuleResult` must include a `rationale` short enough to render in a CLI table (< 200 chars).
- **Actionable.** Every `fail` or `warn` should set `fixHint` (inline, one line) and/or `docsUrl` on the rule. Prefer `docsUrl` at the rule level so reporters can always link.
- **No network calls inside rules.** Use the `AuditContext` that the engine already fetched. If you need an extra resource, add it to the context builder (`src/context.ts`) so it is shared across rules.
- **Deterministic.** Running the same rule against the same context twice must produce identical results — no timestamps in rationale, no randomness.
- **Weight thoughtfully.** 1–10. Rules with bigger real-world impact get higher weights.
- **Impact vs weight.** `weight` affects scoring; `impact` is for UX/prioritization in reports. Keep them consistent — a `critical` impact rule should not have weight 1.

## Stable IDs

`stableId` is a **contract**. Once a rule ships, its `stableId` must never change — CI budgets, external dashboards, and downstream tooling pin rules by it. If you need to rename a rule:

- Change the human-facing `id` and `title` freely.
- Leave `stableId` alone, or, if truly necessary, add a migration note in `CHANGELOG.md` under a major version bump.

## Commit style

Conventional Commits: `feat: ...`, `fix: ...`, `docs: ...`, `chore: ...`, `test: ...`, `refactor: ...`.

## Publishing (maintainers)

1. Bump `package.json` version (semver).
2. Update `CHANGELOG.md` with an entry for the new version.
3. `git tag vX.Y.Z && git push --tags` — the `publish.yml` workflow publishes to npm automatically.