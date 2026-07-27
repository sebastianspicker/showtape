# Browser Tests

The Playwright suite intercepts first-party API routes and provides a browser
MusicKit mock. It does not use live setlist.fm credentials, an Apple account, or
an Apple Music library.

## Coverage

- Import and preview with a fixed setlist fixture
- Automatic matching and manual catalog search
- Successful playlist creation and resumable partial export
- Keyboard focus and stage transitions
- Serious and critical axe findings
- Horizontal overflow at 320, 375, 640, and desktop CSS viewport widths
- Long-content behavior at 320 CSS pixels

## Commands

```bash
corepack pnpm@9.15.3 test:e2e
corepack pnpm@9.15.3 test:e2e:screenshots
corepack pnpm@9.15.3 test:e2e:performance
```

The Playwright server builds `@repo/shared` and `@repo/core` before starting
Next.js. The performance command builds the full workspace and runs against the
production server. Its LCP and CLS result is a local lab measurement, not field
data.

CI uploads the Playwright report and test output after the browser job. If a
local Playwright browser is unavailable, install it with:

```bash
corepack pnpm@9.15.3 --filter web exec playwright install chromium
```

Alternatively, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to a compatible
Chromium executable.
