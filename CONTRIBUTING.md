# Contributing

## PR Style

- Open a branch from `dev` using short prefixed names: `feat/…`, `fix/…`, `docs/…`, `refactor/…`, `test/…`. Release PRs promote `dev` to `main`.
- Keep PRs focused; link to issues or exec plans if applicable.
- Ensure CI passes (format check, lint, typecheck, build, test, dependency audit).

## Lint / Test / Format / Build

- **Lint:** Run `pnpm lint` from the repo root. Fix any reported issues before pushing.
- **Typecheck:** Run `pnpm typecheck` before build or test changes.
- **Test:** Run `pnpm test`. New logic in `packages/core` or shared code should include tests.
- **Format:** Use Prettier (project config in repo). Run `pnpm format` or rely on editor format-on-save with `.editorconfig`.
- **Build:** Run `pnpm build` to build all workspace packages; ensure it succeeds before pushing.
- **Public boundary:** Run `pnpm hygiene:check` to reject private keys, local tool state, reports, and absolute home paths from the publishable tree.
- **Audit:** Run `pnpm audit:security` to match the CI production dependency gate.

CI enforces all of the above on every push and PR.

### Pre-push checklist

Run this before pushing to avoid CI failures:

```bash
pnpm format:check
pnpm hygiene:check
pnpm lint
pnpm typecheck
pnpm build
pnpm test
pnpm audit:security
```

## Test conventions

- **Framework:** [Vitest](https://vitest.dev/).
- **Location:** `tests/` directory in each package/app (`packages/core/tests/`, `apps/web/tests/`, etc.).
- **Naming:** `*.test.ts`.
- **Run:** `pnpm test` from root runs all workspace tests. To run a single package: `pnpm --filter core test`.
- **Scope:** tests cover normalization, search-query building, setlist mapping, dedupe, CORS headers, fetch helpers, API URL construction, MusicKit token/catalog/playlist, rate limiter memory bounds, route handlers, component rendering, and hook state transitions.
- **Patterns:** `vi.mock` for module-level mocks, `vi.stubGlobal` for browser globals (`fetch`, `window.sessionStorage`). Standard `describe`/`it` structure with `beforeEach`/`afterEach` for cleanup.

## Optional scripts

- **seed-demo-setlists:** With `SETLISTFM_API_KEY` set, run `npx tsx scripts/seed-demo-setlists.ts` to fetch demo setlists into `scripts/fixtures/demo-setlists.json` (useful for local dev or fixtures).
- **export-diagnostics:** Run `npx tsx scripts/export-diagnostics.ts` or `mkdir -p reports && npx tsx scripts/export-diagnostics.ts --out reports/diagnostics.json` to export support metadata. Output is constrained under the current working directory and excludes secret values, but API URLs, environment-variable names, platform, and runtime metadata must still be reviewed before sharing.
- **cleanup-repo:** Run `bash scripts/cleanup-repo.sh` to remove local logs, OS artifacts, and build caches that should not be committed.

## No Secrets

Do not commit `.env`, API keys, private keys, credentials, live API fixtures,
diagnostics, browser storage state, or personal data. Use `.env.example` as a
template with placeholders only. Run `pnpm hygiene:check` before publishing.

## Questions

Open an issue and use [docs/index.md](docs/index.md) as the docs entrypoint.
