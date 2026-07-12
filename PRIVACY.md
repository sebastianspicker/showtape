# Privacy

## Data minimization

- We do not require an account. You use your own Apple Music account through MusicKit, and we do not store your Apple credentials.
- Public setlist.fm data is used only to show the setlist and create your playlist. Successful upstream responses may be cached in server memory for up to one hour and are not persisted to disk by the application.
- We do not sell or share your data for advertising.

## Where data lives

- Apple handles MusicKit authentication, catalog search, and playlist creation under Apple’s privacy terms.
- Setlist content comes from setlist.fm under its terms and privacy policy.
- Application servers may log minimal request data such as IP address and path for operation and security. They do not store Apple or setlist.fm credentials.
- Your browser stores up to eight recent imports in localStorage with input, setlistId, artist, venue, and date. Valid v1 input-only history is migrated locally and enriched after re-import. Interrupted exports may store the playlist ID, remaining song IDs, and a selection signature in sessionStorage for up to 30 minutes so an exact resume is safe.

## Network-only public alpha

- There is no service worker, offline access, or background sync. Import, matching, authorization, and playlist creation require network access.

For formal terms, see TERMS.md.
