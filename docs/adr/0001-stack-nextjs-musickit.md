# ADR 0001: One Next.js application with explicit boundaries

## Status

Accepted

## Context

Showtape needs browser-side Apple Music access while keeping Apple signing and
setlist.fm credentials private. It also needs a structure that keeps pure setlist
and matching logic testable without turning every feature into its own package.

## Decision

- Use one root Next.js App Router application with React and TypeScript.
- Keep `src/app` thin; put pure shapes in `src/contracts` and pure rules in
  `src/domain`.
- Put concrete setlist.fm and Apple developer-token work in `src/server`, along
  with CORS and proxy-trust policy.
- Put same-origin Showtape HTTP calls and MusicKit JS operations in `src/client`.
- Put user-flow orchestration in `src/workflow` and shared presentation pieces in
  `src/ui`.
- Use MusicKit JS in the browser only, for catalog search, authorization, and
  playlist writes.
- Provide no alternate browser API origin and no separately deployable API
  service.

## Consequences

One process serves the pages and the `/api` routes. Browser calls to those routes
use the current origin, while `ALLOWED_ORIGIN` and `TRUST_PROXY` stay as server
HTTP policy settings. Apple and setlist.fm credentials remain server-side, and
the MusicKit user token remains in browser state. The application stays
network-dependent, and the static demo stays simulated rather than becoming live
integration proof.
