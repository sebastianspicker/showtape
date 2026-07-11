# Workflow Screenshots

The images in `workflow/` are deterministic captures of the real `/` workflow:
import, preview, matching, manual search, export, partial recovery, and success.
Responsive captures cover 320, 375, 640, and 1440 CSS-pixel widths, including a
long-content case at 320px.

They are public-alpha UI evidence, not proof of live third-party integration.
MusicKit and setlist.fm are mocked during capture; live Apple Music authorization
and credential-backed playlist creation remain owner-run release checks.

To refresh the images:

1. Install the Playwright Chromium browser described in
   [`apps/web/e2e/README.md`](../../apps/web/e2e/README.md).
2. Run `pnpm test:e2e:screenshots` from the repository root.
3. Review every changed image for personal data, unexpected upstream content,
   clipping, and inaccurate state before publishing it.

Do not add hand-composed demo screens or live user data to this directory.
