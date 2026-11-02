# Apple Music integration

## Account setup

Configure MusicKit in your Apple Developer account, create a MusicKit private
key, and set the four Apple variables described in
[deployment and configuration](../DEPLOYMENT.md). Apple keeps the current account
and key requirements in the
[Apple Music API documentation](https://developer.apple.com/documentation/applemusicapi).

## Token boundary

`src/server/apple-token/sign.ts` signs a one-hour ES256 developer token from the
server-only team ID, key ID, and private key, using Node's built-in crypto. When
`ALLOWED_ORIGIN` is set, the token carries those origins in its `origin` claim,
so other websites cannot reuse it. The browser caches that token for
55 minutes and uses it to initialize MusicKit with the browser-visible app
identifier.

MusicKit obtains the user's authorization token in the browser. Showtape never
sends the user token, playlist name, selected track IDs, or Apple responses
through its API routes.

## Browser operations and write safety

The browser searches the current storefront, creates a library playlist after
explicit authorization, and adds selected songs in ordered batches of 100.
Catalog results stay in a bounded five-minute browser-memory cache.

Calls go through MusicKit v3's `music.api.music(path, query, options)`. Apple
answers a refused write with an HTTP 4xx status (other than 408); Showtape treats
that as definite, and a refused add-tracks batch keeps the exact remaining IDs
for one resumable operation. A transport failure, a timeout, or a 5xx is
ambiguous: Apple may have applied the write before the browser saw the response.
In that case Showtape asks you to inspect your library and does not retry
automatically. An unconfirmed playlist create is remembered in the tab's
`sessionStorage`, so going back and returning to the export step keeps the
warning instead of offering a plain create; if the browser blocks that storage,
the warning lasts only while the export step stays open.

Live authorization and playlist writes need an Apple Music account and sit
outside the automated test boundary.
