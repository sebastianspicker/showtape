# API Reference

The Next.js application serves all API routes. Local examples use
`http://localhost:3000`.

JSON responses include `Content-Type: application/json`,
`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, and CORS headers.
`OPTIONS` responses have no body and include only preflight headers.

Errors generally use:

```json
{
  "error": "Human-readable message",
  "code": "BAD_REQUEST"
}
```

The `code` field is absent from the missing-query-parameter response. Current
codes are `BAD_REQUEST`, `NOT_FOUND`, `RATE_LIMIT`, `INTERNAL`, and
`SERVICE_UNAVAILABLE`.

## GET /api/health

Returns process liveness information. It does not test setlist.fm, Apple
credentials, or Apple Music.

Success, HTTP 200:

```json
{
  "status": "ok",
  "timestamp": "2026-07-24T12:00:00.000Z"
}
```

```bash
curl --fail --silent http://localhost:3000/api/health
```

## GET /api/apple/dev-token

Signs and returns a one-hour ES256 Apple developer token.

Required server variables:

- `APPLE_TEAM_ID`
- `APPLE_KEY_ID`
- `APPLE_PRIVATE_KEY`

Success, HTTP 200:

```json
{
  "token": "eyJ..."
}
```

Configuration or signing failure returns HTTP 503 with
`SERVICE_UNAVAILABLE`. Unexpected errors return HTTP 500 with `INTERNAL`.
Responses use `Cache-Control: no-store` and `Pragma: no-cache`.

When `TRUST_PROXY=1` and a forwarded client key is available, the route applies
a fixed limit of 30 requests per 60 seconds. Otherwise per-client limiting is
disabled and the response includes:

```text
X-RateLimit-Policy: disabled-direct-no-trusted-client-key
```

```bash
curl --fail --silent http://localhost:3000/api/apple/dev-token
```

## GET /api/setlist/proxy

Accepts either query parameter:

- `id`: a 4 to 12 character hexadecimal setlist ID
- `url`: a setlist.fm setlist URL from which the ID can be parsed

If both are present, `id` takes precedence. Input is limited to 2,000
characters. The setlist.fm API key remains on the server.

```bash
curl --fail --silent \
  'http://localhost:3000/api/setlist/proxy?id=63de4613'
```

Successful responses contain the validated setlist.fm payload and use:

```text
Cache-Control: private, max-age=3600
```

Error responses use `Cache-Control: no-store`.

| Status | Condition                                         |
| ------ | ------------------------------------------------- |
| 400    | Missing, too long, or invalid `id` or `url` input |
| 404    | setlist.fm did not find the requested setlist     |
| 429    | Local trusted-proxy limit or upstream rate limit  |
| 500    | Unexpected application error                      |
| 503    | Missing API key or upstream server failure        |

When `TRUST_PROXY=1` and a forwarded client key is available, the route applies
a fixed limit of 20 requests per 60 seconds.

## OPTIONS

Each API route accepts `OPTIONS` and returns HTTP 204. For an allowed origin the
response includes:

```text
Access-Control-Allow-Origin: <request origin>
Access-Control-Allow-Methods: GET, OPTIONS
Access-Control-Allow-Headers: Content-Type
Access-Control-Max-Age: 86400
```

`ALLOWED_ORIGIN` is a comma-separated exact-origin allowlist. When it is unset,
only HTTP origins on `localhost` or `127.0.0.1` are allowed. Wildcard and `null`
origins are rejected.
