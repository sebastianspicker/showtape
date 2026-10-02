# Changelog

This file records user-visible and maintainer-relevant changes. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## Unreleased

Current root-package version: `0.3.0-alpha.1`, untagged and unpublished.

### Added

- Public `/privacy` and `/terms` routes backed by maintained root documents.
- Showtape product metadata, web manifest icons, and browser mark.
- Visible setlist.fm source attribution using the validated response URL or the
  setlist.fm homepage fallback.
- A public-boundary check for local state and sensitive file patterns.
- Optional ordered duplicate removal and bounded session recovery for known
  partial track-add failures.

### Changed

- Reconstructed the codebase around explicit boundaries: one module per API
  endpoint under `src/server/routes` with a single environment reader, one
  same-origin API caller in the browser, and one state owner per workflow stage.
  The HTTP contract, browser storage keys, and interface copy are unchanged.
- Updated Next.js to 16.3.8 (GHSA-vcvr-r3jv-pc5j) and restored the pnpm
  security overrides, which pnpm 9 had silently ignored in
  `pnpm-workspace.yaml`; they now live in `package.json`.
- Returning to matching after leaving it mid-run now resumes searching the
  songs that were still pending instead of leaving them stuck.
- The CSP build check ignores Next's runtime route cache, so restarting a
  build that has already served pages no longer fails closed.
- A missing `SETLISTFM_API_KEY` is logged server-side.
- Renamed the application from Setlist to Playlist to Showtape.
- Updated the web application to Next.js 16 and React 19.
- Replaced the removed demo route with a static workflow demo using bundled sample data.
- Browser import history now retains only user-entered URLs or IDs and parsed IDs.
  Legacy upstream artist, venue, date, and song metadata is discarded during
  migration.
- Setlist requests now have a 10 second total upstream deadline, coalesce identical
  in-flight IDs, validate the minimum response shape, and keep bounded 429 retry.
- API routes return structured error codes and apply documented rate-limit policy.
- MusicKit logic is split into token, client, catalog, and playlist modules.
- The application now uses one root Next.js package with explicit contracts,
  domain, server, client, workflow, and UI boundaries. Browser API calls are
  intentionally same-origin only.

### Fixed

- Ambiguous Apple Music create or add failures no longer offer an unsafe automatic
  retry that could duplicate playlists or tracks.
- Late setlist and matching responses no longer overwrite newer user work.
- Browser history, diagnostic, trace, key, report, and local tool paths are covered
  by the public repository boundary.
- API failure bodies, oversized upstream responses, timeout states, and cache bounds
  return deterministic errors.

## 0.2.1, 2026-03-22

### Added

- React Testing Library, jsdom, component tests, and CSP middleware tests.

### Fixed

- Accessible search-result names and dynamic loading status text.
- MusicKit initialization timeout settlement and development-only error logging.

## 0.2.0, 2026-03-22

### Added

- Content Security Policy and browser security headers.
- MusicKit client integration tests.

### Fixed

- Export resume writes now tolerate unavailable browser storage.
- Playlist response handling uses a declared MusicKit response type.

## 0.1.0

### Added

- Initial application, API handlers, documentation, and scripts.
