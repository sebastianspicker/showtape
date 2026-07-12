# Frontend

Next.js App Router (v16), TypeScript, React.

## App Router patterns

- **File conventions:** `layout.tsx`, `page.tsx`, `loading.tsx`, `error.tsx`, `global-error.tsx`, `not-found.tsx`; API routes under `app/api/*/route.ts`; `apps/web/middleware.ts` applies the nonce-based CSP and browser security headers for app pages.
- **Rendering:** Root page is a Server Component (static shell); interactive flow lives in a Client Component (`SetlistImportView`, `'use client'`) under `src/features/`. Data is fetched from the client via Route Handlers (setlist proxy, dev token) after user input, not in the RSC tree.
- **Route Handlers:** Use `NextRequest` / `NextResponse`; JSON via `jsonResponse()` (NextResponse.json + CORS). No dynamic segment params; query params via `request.nextUrl.searchParams`. OPTIONS for CORS preflight return 204 with CORS headers.
- **Loading and errors:** Segment-level `loading.tsx` (Suspense); `error.tsx` and `global-error.tsx` as Client Components with reset; `not-found.tsx` for 404 with `Link` back home.
- **Imports:** Use direct imports from source files (e.g. `@/components/ErrorAlert`) instead of app-local barrel files (`@/components` or `@/features/*`). The web app is not a published package surface.

## Config and API

Config lives in `apps/web/src/lib/config.ts`. It reads `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_APPLE_MUSIC_APP_ID` from the environment. Client-side API calls go through the helpers in `apps/web/src/lib/api.ts` (`apiUrl()`, `devTokenUrl()`, `setlistProxyUrl()`), so changing `NEXT_PUBLIC_API_URL` is the single knob to redirect those requests. In dev, if the API and web app share the same Next.js process, leave `NEXT_PUBLIC_API_URL` unset (same-origin) or set it to `http://localhost:3000`.

## Features and MusicKit

Features live under `apps/web/src/features/`: `setlist-import`, `matching`, and `playlist-export`. MusicKit client logic is split into `lib/musickit/` modules — one each for token caching, SDK init, catalog search, and playlist writes.

## Routes and browser delivery

The public-alpha route surface is the workflow at `/` and the supporting
`/privacy` and `/terms` pages. There is no `/demo` route.

`manifest.webmanifest` is linked in the root layout and icons are in
`public/icons/`, but the app does not register a service worker. The alpha is
therefore network-only: the manifest must not be described as an offline or
installability guarantee. Importing, matching, Apple Music authorization, and
playlist creation all need network access.

Screenshot automation drives the real workflow with deterministic fixture data.
Chromium covers keyboard focus transitions, long content, serious/critical axe
findings, and reflow at CSS viewports equivalent to common 200% and 400% zoom
conditions. Safari, VoiceOver, and credential-backed service checks remain
owner-run release work.

## Local design iteration

The checked-in `.impeccable/design.json` identifies `DESIGN.md` as the canonical
target, while `.impeccable/live/config.json` limits live injection to the root
layout. Development CSP permits `http://localhost:8400` for that workflow;
middleware tests prove the origin is absent from production CSP.

## Local import history

Recent imports use browser `localStorage` only. Each history v2 record has
`input`, `setlistId`, `artist`, `venue`, and `date`, allowing a completed import
to be recognized locally. A valid v1 string entry migrates once with its `input`;
the other fields are populated only after that import is loaded again. Invalid
legacy data is safely ignored. This is a browser-local migration, not an account
or server-data migration.

## Performance baseline

The post-overhaul production asset baseline is recorded in
`docs/performance-public-alpha.json`. Regenerate the detailed measurement after
`pnpm build` with `pnpm bundle:report`; compare its totals with the recorded
baseline before accepting future bundle growth.
