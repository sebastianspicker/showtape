# Data Flow

## Setlist import

1. The browser sends an ID or URL to `GET /api/setlist/proxy`.
2. The Next.js route validates input length and rate-limit state.
3. The reusable handler parses the ID and reads `SETLISTFM_API_KEY`.
4. The server fetches setlist.fm and validates the requested ID, event date,
   artist name, and optional set array.
5. The browser maps the payload and removes songs marked `tape: true`.
6. The source link remains visible in preview, matching, and export.

## Apple Music matching

1. The browser fetches a developer token from `GET /api/apple/dev-token`.
2. MusicKit searches the current storefront by normalized song and artist.
3. The browser stores suggestions and user corrections in component state.
4. Catalog requests go directly from the browser to Apple Music.

## Playlist export

1. MusicKit authorizes the user in the browser.
2. The browser creates a playlist in the user's Apple Music library.
3. The browser adds selected song IDs in batches of 100.
4. A definite partial failure can place remaining IDs in `sessionStorage`.

The playlist name, selected IDs, Apple user token, and Apple responses do not
pass through the Showtape API routes.
