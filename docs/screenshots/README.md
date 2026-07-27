# Workflow Screenshots

The `workflow/` directory contains Playwright captures from the `/` workflow.
The tests intercept the application API routes and use a browser MusicKit mock.
The images do not verify live setlist.fm or Apple Music behavior.

| File or group                       | State                                        |
| ----------------------------------- | -------------------------------------------- |
| `import.png`                        | Initial import form.                         |
| `preview.png`                       | Imported show metadata and songs.            |
| `matching-pending.png`              | Automatic catalog search in progress.        |
| `matching-complete.png`             | Completed suggestions and per-song controls. |
| `manual-search.png`                 | Manual catalog search.                       |
| `export.png`                        | Final track selection and duplicate option.  |
| `partial.png`                       | Partial or uncertain playlist write.         |
| `success.png`                       | Completed mocked playlist write.             |
| `responsive-{320,375,640,1440}.png` | Preview at the named CSS viewport width.     |
| `responsive-long-content-320.png`   | Long content at 320 CSS pixels.              |

## Refreshing screenshots

Install the Playwright browser once:

```bash
corepack pnpm@9.15.3 --filter web exec playwright install chromium
```

Run the screenshot suite from the repository root:

```bash
corepack pnpm@9.15.3 test:e2e:screenshots
```

Review every changed image for personal data, unexpected upstream content,
clipping, focus artifacts, and inaccurate state before publishing it. Do not
add hand-composed screens or captures containing live user data.
