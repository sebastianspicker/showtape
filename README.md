# Setlist to Playlist

[![CI](https://github.com/sebastianspicker/setlist-to-playlist/actions/workflows/ci.yml/badge.svg)](https://github.com/sebastianspicker/setlist-to-playlist/actions/workflows/ci.yml)

Turn one concert setlist into an Apple Music playlist through a focused,
four-step workflow.

Paste a [setlist.fm](https://www.setlist.fm) link, preview the tracks, fix any mismatches, and save the playlist straight to your Apple Music library.

### How it works

1. **Paste** a setlist.fm URL (or setlist ID)
2. **Preview** the artist, venue, date, and full track list
3. **Match** each song to the right Apple Music track (auto-suggested, manually adjustable)
4. **Create** the playlist in your Apple Music library with one tap

### Features

- Import any setlist from setlist.fm by URL or ID
- Automatic Apple Music track matching with manual override
- Search Apple Music to fix unmatched or incorrect tracks
- Duplicate track removal before export
- Resumable playlist creation if adding tracks is interrupted
- Recent imports, stored only in the browser, for quick re-access
- Network-only public alpha: importing, matching, authorization, and export all require connectivity
- Privacy and terms pages at `/privacy` and `/terms`
- Accessibility target: WCAG 2.2 AA, keyboard-complete operation, visible focus, and 44px normal controls
- Calm, phone-first "Working Setlist" interface; see [DESIGN.md](DESIGN.md)

## Prerequisites

- **Node.js** ≥ 20 (see `engines` in root `package.json`)
- **pnpm** ≥ 9 (the repo uses a pnpm workspace)

## Environment

Copy `.env.example` to `.env` in the repo root and set:

- **Apple Music:** `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY` (for the Developer Token), and `NEXT_PUBLIC_APPLE_MUSIC_APP_ID` (MusicKit in the browser). See [docs/tech/apple-music.md](docs/tech/apple-music.md).
- **setlist.fm:** `SETLISTFM_API_KEY` (used only by the server-side proxy; never sent to the client). See [docs/tech/setlistfm.md](docs/tech/setlistfm.md).
- **Optional:** `NEXT_PUBLIC_API_URL` – base URL for API calls. Leave unset for same-origin (default when the app and API run together). Set only when the API is served from a different origin.
- **Production CORS:** `ALLOWED_ORIGIN` – required when the app is deployed; see [docs/tech/security.md](docs/tech/security.md) and `.env.example`.
- **Proxy deployments:** `TRUST_PROXY=1` only when a trusted reverse proxy sets `X-Forwarded-For` / `X-Real-IP` on your behalf. Leave it unset for direct deployments; per-client API rate limiting is then deliberately disabled and responses expose `X-RateLimit-Policy: disabled-direct-no-trusted-client-key`.

## Quick Start

```bash
cp .env.example .env   # then fill in your API keys (see Environment above)
pnpm install
pnpm build
pnpm dev
```

Then open the web app at `http://localhost:3000`. The same process runs both the Next.js frontend and the API routes (Developer Token, setlist proxy, health); no separate API server is required for local development.

### Screenshots

Screenshots for public surfaces must be captured from the real import → preview
→ match → export flow using deterministic fixtures or controlled upstream
responses. They must not use a separate `/demo` route. See the
[screenshot capture notes](docs/screenshots/README.md). Mocked Chromium,
responsive overflow, and serious/critical axe checks are automated; live Apple
Music authorization remains an owner-run release check.

## Monorepo Overview

| Path              | Description                                                                                                                                           |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web`        | Next.js web app: Import → Preview → Matching → Export, plus `/privacy` and `/terms`. Hosts API routes at `/api/*` (dev-token, setlist proxy, health). |
| `apps/api`        | Shared serverless logic (JWT signing, setlist proxy handler). Used by the web app's API routes; not run as a standalone server in this repo.          |
| `packages/core`   | Domain logic: setlist parsing, track matching, normalization (no UI).                                                                                 |
| `packages/shared` | Shared types, utils, constants.                                                                                                                       |
| `packages/ui`     | Shared React UI primitives used by the web app.                                                                                                       |
| `docs/`           | Product requirements, technical documentation, ADRs, and deterministic release evidence.                                                              |

See [ARCHITECTURE.md](ARCHITECTURE.md) for data flow and [docs/index.md](docs/index.md) for the docs map.

## Reading Map

For a first code read, follow the active product flow in this order:

1. `apps/web/src/app/page.tsx` mounts the main app shell and `SetlistImportView`.
2. `apps/web/src/features/setlist-import/SetlistImportView.tsx` renders the four visible steps: import, preview, matching, export.
3. `useSetlistImportState.ts` fetches `/api/setlist/proxy` and maps setlist.fm JSON through `mapSetlistFmToSetlist`.
4. `MatchingView.tsx` combines automatic suggestions from `useMatchingSuggestions.ts` with manual Apple Music search from `useTrackSearch.ts`.
5. `CreatePlaylistView.tsx` uses `useCreatePlaylistState.ts` to create the Apple Music playlist and resume interrupted track adds.
6. `apps/web/src/app/api/*/route.ts` contains the HTTP layer; those route handlers delegate reusable logic to `apps/api/src/routes/`.

## Project Structure

```
.
├── README.md
├── ARCHITECTURE.md
├── PRODUCT.md                 # product intent and audience
├── DESIGN.md                  # canonical interface requirements
├── CONTRIBUTING.md
├── CHANGELOG.md
├── LICENSE
├── SECURITY.md
├── PRIVACY.md
├── TERMS.md
├── .env.example
├── .gitignore
├── .editorconfig
├── .prettierrc
├── eslint.config.mjs
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
├── apps/
│   ├── web/                     # Next.js app + API routes
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── api/          # Next.js API routes
│   │   │   │   │   ├── apple/dev-token/
│   │   │   │   │   ├── setlist/proxy/
│   │   │   │   │   └── health/
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── page.tsx
│   │   │   │   ├── error.tsx
│   │   │   │   └── global-error.tsx
│   │   │   ├── features/
│   │   │   │   ├── setlist-import/
│   │   │   │   ├── matching/
│   │   │   │   └── playlist-export/
│   │   │   ├── lib/
│   │   │   └── styles/
│   │   ├── middleware.ts          # CSP and browser security headers
│   │   ├── public/
│   │   │   ├── manifest.webmanifest
│   │   │   └── icons/
│   │   ├── tests/
│   │   ├── e2e/                 # mocked browser workflow and accessibility checks
│   │   └── package.json
│   └── api/                      # Shared API logic (used by web's routes)
│       ├── src/
│       │   ├── routes/
│       │   │   ├── apple/dev-token.ts
│       │   │   ├── setlist/proxy.ts
│       │   │   └── health.ts
│       │   └── lib/
│       ├── tests/
│       └── package.json
├── packages/
│   ├── core/                     # Domain logic
│   │   ├── src/
│   │   │   ├── setlist/
│   │   │   ├── matching/
│   │   │   └── index.ts
│   │   └── tests/
│   ├── shared/
│   │   ├── src/
│   │   │   ├── types/
│   │   │   ├── utils/
│   │   │   └── index.ts
│   │   └── tests/
│   └── ui/                       # Shared React UI primitives
│       └── src/
├── docs/
│   ├── index.md
│   ├── product-specs/          # PRD as single source
│   ├── tech/
│   ├── screenshots/workflow/   # deterministic real-flow captures
│   ├── performance-public-alpha.json
│   └── adr/
└── scripts/
    ├── cleanup-repo.sh
    ├── seed-demo-setlists.ts     # controlled data for local development or tests
    └── export-diagnostics.ts
```

## Scripts

| Command              | Description                                               |
| -------------------- | --------------------------------------------------------- |
| `pnpm install`       | Install dependencies for all workspace packages.          |
| `pnpm build`         | Build all workspace packages in dependency order.         |
| `pnpm dev`           | Start the Next.js dev server (web app and API routes).    |
| `pnpm lint`          | Run ESLint in all packages.                               |
| `pnpm typecheck`     | Run TypeScript checks across typed workspace packages.    |
| `pnpm test`          | Run tests in all packages.                                |
| `pnpm format`        | Format code with Prettier.                                |
| `pnpm format:check`  | Check formatting without writing.                         |
| `pnpm hygiene:check` | Reject private and local-only files from the public tree. |
| `pnpm cleanup:repo`  | Remove local generated artifacts and caches.              |

Optional (run from repo root with `npx tsx`):

- **seed-demo-setlists:** `SETLISTFM_API_KEY=your_key npx tsx scripts/seed-demo-setlists.ts` – fetches controlled setlist data and writes `scripts/fixtures/demo-setlists.json` for local development or tests. It does not create a public `/demo` route.
- **export-diagnostics:** `npx tsx scripts/export-diagnostics.ts` or `mkdir -p reports && npx tsx scripts/export-diagnostics.ts --out reports/diagnostics.json` – exports support metadata without secret values. Reports stay ignored locally; review API URLs, environment-variable names, platform, and runtime metadata before sharing.
- **cleanup-repo:** `bash scripts/cleanup-repo.sh` – removes local non-source artifacts (logs, `.DS_Store`, build caches) without touching tracked source files.

## Deployment

See [docs/tech/deployment.md](docs/tech/deployment.md) for full self-hosted deployment instructions. The short version:

1. Set the required environment variables (see [Environment](#environment) above and `.env.example`).
2. Build the workspace and run the `apps/web` Next.js server behind your reverse proxy.
3. Verify with `GET /api/health` -> `{"status":"ok"}`.

## Verification

Run the repo checks from the root:

```bash
pnpm format:check
pnpm hygiene:check
pnpm lint
pnpm typecheck
pnpm build
pnpm test
pnpm audit:security
```

Local verification on 2026-07-11 passed formatting, public-boundary, lint,
TypeScript, production build, all workspace tests (including 192 web tests),
the production dependency audit, and the mocked Chromium workflow (6 passed,
1 production-only case skipped). The separate production lab check passed at
LCP 136 ms and CLS 0.0000. These local measurements do not replace the pending
credential-backed Apple Music check, Safari/VoiceOver pass, or deployed field
performance data.

## Behavior Notes

- **Setlist IDs:** raw IDs and URL-derived IDs are validated as `4-12` hexadecimal characters.
- **Tape entries:** setlist.fm songs marked with `tape: true` are excluded from playlist mapping.
- **Network-only alpha:** the linked web manifest does not imply offline support or a service worker. All user workflow stages require network access.
- **Interrupted exports:** if playlist creation succeeds but adding tracks stops partway through, the app stores only the remaining Apple Music song IDs in `sessionStorage` and resumes only those tracks. Resume data is ignored if the current matched tracks or duplicate-removal setting no longer match the stored export.

## License

See [LICENSE](LICENSE). For privacy and terms, see [PRIVACY.md](PRIVACY.md) and [TERMS.md](TERMS.md).
