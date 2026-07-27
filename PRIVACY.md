# Privacy

## Data minimization

- We do not require an account. You use your own Apple Music account through MusicKit, and we do not store your Apple credentials.
- Public setlist.fm data is displayed after retrieval and used to prepare the playlist. Successful upstream responses may be cached in server memory for up to one hour and are not persisted to disk by the application.
- The current alpha does not include analytics, advertising, or a Showtape user-account database.

## Where data lives

- Apple handles MusicKit authentication, catalog search, and playlist creation under Apple’s privacy terms.
- Setlist content comes from setlist.fm under its terms and privacy policy.
- Hosting infrastructure may log request metadata such as IP address and path. Logging and retention depend on the deployment; the application does not intentionally log credential values.
- Your browser stores up to eight recent user-entered setlist URLs or IDs and their parsed IDs in localStorage. Legacy history is migrated without retaining upstream artist, venue, date, or song data. Interrupted exports may store the playlist ID, exact remaining song IDs or an unknown-progress marker, and a selection signature in sessionStorage for up to 30 minutes. Automatic resume is available only when the remaining IDs are known.

## Network-only public alpha

- There is no service worker, offline access, or background sync. Import, matching, authorization, and playlist creation require network access.

For formal terms, see TERMS.md.
