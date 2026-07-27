# ADR 0001: Next.js and MusicKit

## Status

Accepted

## Context

The application needs browser access to Apple Music while keeping the Apple
private key and setlist.fm API key off the client. The repository also needs one
deployable HTTP process.

## Decision

- Use Next.js App Router, React, and TypeScript for the web application.
- Use MusicKit JS in the browser for catalog search, authorization, and playlist
  writes.
- Use Next.js Route Handlers as the HTTP entry points.
- Keep reusable token and setlist handlers in `packages/api`.
- Keep the application network-dependent and do not register a service worker.

## Consequences

One Next.js process serves pages and API routes. `packages/api` remains reusable but
is not independently deployable from this repository. Apple and setlist.fm
credentials remain on the server, while the MusicKit user token remains in the
browser.
