# Privacy

## Data Minimization

- We do not require an account on our side. You use your own Apple Music account via Apple’s MusicKit; we do not store your Apple credentials.
- Setlist data is fetched from setlist.fm (public data). We use it only to show you the setlist and create a playlist in your Apple Music library. Successful upstream responses are cached in memory by the server process for up to one hour; the cache is bounded and is not persisted to disk by the application.
- We do not sell or share your data with third parties for advertising.

## Where Data Lives

- **Apple:** When you authorize the app, Apple Music handles authentication. Playlist creation and catalog search are done through Apple’s APIs under their privacy terms.
- **setlist.fm:** Setlist content comes from setlist.fm’s API. Their terms and privacy policy apply to that data.
- **Our servers:** If we run an API (e.g. for Developer Token or setlist proxy), we may log minimal request data (e.g. IP, path) for operation and security. We do not store your Apple or setlist.fm credentials.
- **Your browser:** The app keeps up to eight recent setlist inputs in `localStorage` until you clear the in-app history or browser site data. If adding tracks is interrupted, `sessionStorage` holds the playlist identifier, remaining Apple Music song IDs, and a selection signature so the operation can resume safely. Resume data is discarded after a successful retry, when it no longer matches the selection, after 30 minutes when next read by the app, or when the browser session storage is cleared.

This document is a high-level overview; it may be updated as the product evolves. For formal terms, see TERMS.md.
