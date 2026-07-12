# E2E Tests

Playwright covers the deterministic core workflow with intercepted first-party API routes and a
browser-side MusicKit mock. No real setlist.fm, Apple Music, account, or credential is used.

## Covered workflow

- **Import and preview** — fixed setlist fixture renders its metadata and tracks.
- **Matching** — automatic matches and a manual catalog search.
- **Export** — successful playlist creation and a resumable partial-import state.
- **Accessibility and layout** — axe rejects serious/critical violations; long content and 320px,
  375px, 640px, and desktop widths reject horizontal overflow. The narrow widths represent the CSS
  viewport available at 400% and 200% browser zoom from common desktop widths.
- **Keyboard and focus** — skip-link focus, step-heading focus, manual-search cancellation and focus
  return, Back navigation, and preserved manual edits.

## Getting started

Run `pnpm test:e2e`. Every named workflow state emits a PNG into the Playwright test output.
Run `pnpm test:e2e:screenshots` to regenerate only those screenshot artifacts. CI uploads the
Playwright report and test output when the browser job completes.

The Playwright web server builds `@repo/shared` and `@repo/core` before starting Next.js, so the
browser commands work after a fresh install or `pnpm cleanup:repo`.

Run `pnpm test:e2e:performance` to build the full workspace, exercise the production server, and
attach the local LCP/CLS measurement. This is a repeatable local lab check, not field performance
data.
