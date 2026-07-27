# Apple Music Integration

## Configuration

Configure MusicKit in the Apple Developer account, create a MusicKit private
key, and set:

```dotenv
APPLE_TEAM_ID=your-team-id
APPLE_KEY_ID=your-key-id
APPLE_PRIVATE_KEY="<PEM contents with literal \\n line breaks>"
NEXT_PUBLIC_APPLE_MUSIC_APP_ID=your-app-id
```

Apple documents account and key setup in the
[Apple Music API documentation](https://developer.apple.com/documentation/applemusicapi).
Credential requirements can change, so verify them against Apple's current
documentation.

## Token handling

`packages/api/src/lib/jwt.ts` signs a one-hour ES256 developer token. The Next.js
route at `GET /api/apple/dev-token` returns it with no-store cache headers. The
browser caches the token for 55 minutes and shares concurrent refresh requests.

MusicKit obtains the user token in the browser during authorization. Showtape
does not send that token to its API routes.

## Browser operations

The browser:

1. loads MusicKit JS;
2. fetches the developer token;
3. configures MusicKit with `NEXT_PUBLIC_APPLE_MUSIC_APP_ID`;
4. searches the user's storefront catalog;
5. authorizes the user when export begins;
6. creates a library playlist;
7. adds selected song IDs in batches of 100.

Catalog search results remain in a bounded browser-memory cache for five
minutes. Storefront codes are limited to two letters and fall back to `us`.

## Write safety

A definite add-tracks error can report the remaining IDs for one resumable
operation. A rejected transport request is ambiguous because Apple may have
applied the write before the client received the response. Showtape requires
library inspection and does not automatically retry that state.

Live authorization and playlist writes require an Apple Music account and are
not exercised by the repository's automated browser tests.
