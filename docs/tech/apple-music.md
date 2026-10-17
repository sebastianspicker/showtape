# Apple Music integration

## Account setup

Configure MusicKit in your Apple Developer account, create a MusicKit private
key, and set the four Apple variables described in
[deployment and configuration](../DEPLOYMENT.md). Apple keeps the current account
and key requirements in the
[Apple Music API documentation](https://developer.apple.com/documentation/applemusicapi).

## Token boundary

`src/server/apple-token/sign.ts` signs a one-hour ES256 developer token from the
server-only team ID, key ID, and private key. The browser caches that token for
55 minutes and uses it to initialize MusicKit with the browser-visible app
identifier.

MusicKit obtains the user's authorization token in the browser. Showtape never
sends the user token, playlist name, selected track IDs, or Apple responses
through its API routes.

## Browser operations and write safety

The browser searches the current storefront, creates a library playlist after
explicit authorization, and adds selected songs in ordered batches of 100.
Catalog results stay in a bounded five-minute browser-memory cache.

A definite add-tracks failure can keep the exact remaining IDs for one resumable
operation. A transport failure is ambiguous: Apple may have applied the write
before the browser saw the response. In that case Showtape asks you to inspect
your library and does not retry automatically.

Live authorization and playlist writes need an Apple Music account and sit
outside the automated test boundary.
