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

## Native MusicKit

The iPhone/iPad and native Mac targets use the system MusicKit framework. Enable
the MusicKit App Service for each registered app bundle identifier in the Apple
Developer account and supply your development team before signed device testing.
Native automatic token management does not use the web `/api/apple/dev-token`
endpoint and embeds no Apple signing key or setlist.fm credential.
`NSAppleMusicUsageDescription` explains the permission request.

Both playlist creation and additions use
[MusicDataRequest](https://developer.apple.com/documentation/musickit/musicdatarequest)
on every native platform, because the installed macOS SDK does not expose the
high-level `MusicLibrary` write methods. Catalog search stays bounded to 500
five-minute entries keyed by storefront, query, and limit; identical in-flight
searches share their result.

Native export serializes writes and persists an in-flight record before each
request. It appends at most 100 ordered IDs per request. A definite rejection can
keep confirmed progress, while transport, response-decoding, and interrupted
mutation outcomes all require checking Apple Music. Reopening the app never
replays an unknown write automatically. Fixture tests use injected fake services
selected explicitly in Debug builds and cannot prove live account, subscription,
permission, or signed-device behavior.
