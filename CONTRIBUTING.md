# Contributing to geo-checker

Thanks for your interest. This project welcomes new rules, bug fixes, and documentation improvements.

## Quick start

```sh
pnpm install
pnpm test
pnpm build
```

## Adding a rule

1. Create a file under `src/rules/<category>/<rule-id>.ts`.
2. Export a `Rule` object using `defineRule()` (from `src/types.ts`). Keep the rule pure — it receives an `AuditContext` and returns a `RuleResult`.
3. Register it in `src/rules/index.ts`.
4. Add a fixture HTML file in `test/fixtures/` that your rule should pass and fail against.
5. Add a unit test in `test/rules/<rule-id>.test.ts`.
6. Add a doc file at `docs/rules/<rule-id>.md` describing the rule and how to fix failures — this path becomes the `fixUrl` in your rule's result.

## Rule design principles

- **Fail fast, explain why.** Every `RuleResult` must include a `rationale` short enough to render in a CLI table (<200 chars).
- **Actionable.** Every `fail` or `warn` should have a `fixUrl` that explains the remediation.
- **No network calls inside rules.** Use the `AuditContext` that the engine already fetched. If you need an extra resource, add it to the context builder (`src/context.ts`) so it is shared across rules.
- **Deterministic.** Running the same rule against the same context twice must produce identical results — no timestamps in rationale, no randomness.
- **Weight thoughtfully.** 1–10. Rules with bigger real-world impact (e.g. schema validity) get higher weights.

## Commit style

Conventional Commits: `feat: ...`, `fix: ...`, `docs: ...`, `chore: ...`.

## Publishing (maintainers)

1. Bump `package.json` version (semver).
2. Update `CHANGELOG.md`.
3. `git tag vX.Y.Z && git push --tags` — the `publish.yml` workflow publishes to npm automatically.
