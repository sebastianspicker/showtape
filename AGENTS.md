# Showtape contributor guide

Showtape is one Next.js app in a single private pnpm package — not a set of
deployable packages. Security-motivated dependency overrides live under
`pnpm.overrides` in `package.json` (pnpm 9 reads them only there).

## Repository map

| Path                          | Responsibility                                                                                      |
| ----------------------------- | --------------------------------------------------------------------------------------------------- |
| `src/app`                     | Pages, layouts, error states. `app/api/**/route.ts` files only re-export handlers.                  |
| `src/server/routes`           | One module per API endpoint: the complete request-to-response behavior.                             |
| `src/server`                  | `config.ts` (its only env reader), `http/` policy, `apple-token/`, `setlistfm/`, `security/` (CSP). |
| `src/client`                  | `showtape-api.ts` (the browser's Showtape API caller) and `music/` (browser MusicKit).              |
| `src/workflow`                | `journey.tsx` (steps, focus, match draft) and stages `import/`, `matching/`, `playlist/`.           |
| `src/contracts`               | Shapes shared by server and browser (API error envelope, dev-token response, `Result`).             |
| `src/domain`                  | Pure setlist parsing, input rules, naming, signatures, and matching transformations.                |
| `src/http`                    | Runtime-neutral bounded Fetch body reading.                                                         |
| `src/ui`, `src/content`       | Generic presentation components; product and legal copy.                                            |
| `tests`                       | Vitest by boundary (`app`, `server`, `client`, `workflow`, …); `tests/browser` is Playwright.       |
| `demo`, `public`, `scripts`   | Simulated static demo, public assets, repository checks.                                            |
| `fixtures/domain-parity.json` | Domain corpus shared with the Swift tests in `native/`.                                             |

## Rules

- `scripts/check-architecture.mjs` enforces layer directions, external-import
  allowlists and no cycles; update its rules deliberately, never to silence it.
- `src/contracts` and `src/domain` stay framework-free. External I/O lives only
  in `src/server` and `src/client`.
- Browser calls to Showtape go to same-origin `/api` paths through
  `src/client/showtape-api.ts`. Don't add a browser-configurable API origin.
  `ALLOWED_ORIGIN` and `TRUST_PROXY` are server HTTP-policy settings only.
- The HTTP contract (paths, statuses, headers, error envelope) is consumed by the
  native app; `tests/app/api-contracts.test.ts` pins it.
- Each workflow stage owns its state; hooks take semantic callbacks, not
  another component's state setters. Except for the `MatchingStep` and
  `ExportStep` shells, eager workflow files import from `matching/` and
  `playlist/` only with `import type`, so MusicKit stays lazy
  (`tests/browser/bundle-boundary.spec.ts`).
- A new API route also needs its path in the `src/proxy.ts` matcher exclusion.
- Persisted browser keys `setlist_import_history_v1..v3` and
  `playlist_resume_v1:<id>` are a compatibility contract.
- MusicKit user tokens stay in the browser; the Apple private key and the
  setlist.fm key stay server-side. The static demo stays simulated.
- Keep `PRIVACY.md`, `TERMS.md`, and `src/content/legal.ts` in step (tested).
- Don't hand-edit `node_modules`, `.next`, `dist`, or test output. Don't edit
  `native/` from web changes; update `fixtures/domain-parity.json` only together
  with both implementations.

## Commands

Run from the repository root with Node.js 20.9+ and pnpm 9.15.3. Node 25+ no
longer ships Corepack; there, use `npx pnpm@9.15.3` in place of
`corepack pnpm@9.15.3`.

```bash
corepack pnpm@9.15.3 install --frozen-lockfile
corepack pnpm@9.15.3 format:check
corepack pnpm@9.15.3 hygiene:check
corepack pnpm@9.15.3 lint
corepack pnpm@9.15.3 check:architecture
corepack pnpm@9.15.3 typecheck
NEXT_PUBLIC_APPLE_MUSIC_APP_ID=showtape-local-test corepack pnpm@9.15.3 build
corepack pnpm@9.15.3 test
corepack pnpm@9.15.3 demo:check
corepack pnpm@9.15.3 audit:security
corepack pnpm@9.15.3 test:browser   # after build; needs Playwright chromium+webkit
```

Focused tests: `corepack pnpm@9.15.3 test -- tests/workflow/journey.test.tsx`.
Run the proportional subset before handoff and `test:browser` for UI, CSP, or
workflow changes. Keep mocked local proof separate from live setlist.fm, Apple
Music, and deployment verification.

## More detail

- [Architecture](docs/architecture.md)
- [Deployment and configuration](docs/DEPLOYMENT.md)
- [Product and interface](PRODUCT.md)
- [Contribution workflow](CONTRIBUTING.md)

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Working together

The user, Claude Code and Codex share this repository, and this file is the
guide both agents read.

- **Roles.** The user sets scope, approves irreversible or outward-facing
  actions, and commits. The agent the user starts implements; the other
  agent reviews. No agent accepts its own work.
- **One writer at a time.** Only one agent edits this checkout at a time.
  Before editing, read `.agents/handoff.md` if it exists and run
  `git status`; preserve changes you did not make.
- **Handoff.** When you stop with work in progress or ask for review,
  overwrite `.agents/handoff.md` (ignored by git, never committed) with:
  status (`in-progress`, `ready-for-review`, `changes-requested` or
  `accepted`), date, goal, files changed, checks run with exit codes, and
  open questions or risks.
- **Review.** Review the uncommitted diff against the goal in the handoff
  note. Report each finding as `file:line`, defect and evidence, and record
  the verdict in the handoff note. Do not rewrite the change unless asked.
- **Ready for review** means the proportional subset of the full local gate
  under "Commands" exits 0 (the whole gate for broad changes). Paste
  failures verbatim and name any check you skipped.
