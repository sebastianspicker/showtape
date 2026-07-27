# Server Handlers

## Process model

The Next.js application in `apps/web` serves pages and HTTP routes. `packages/api`
exports reusable handlers and does not listen on a port.

| Route                      | Responsibility                                                   |
| -------------------------- | ---------------------------------------------------------------- |
| `GET /api/health`          | Return process liveness and a timestamp.                         |
| `GET /api/apple/dev-token` | Sign an Apple developer token using server credentials.          |
| `GET /api/setlist/proxy`   | Validate input and fetch a setlist with the server-side API key. |

Route Handlers under `apps/web/src/app/api` own request parsing, CORS, rate
limits, cache headers, and JSON responses. The `packages/api` package owns token
signing, upstream setlist access, response validation, and upstream error
mapping.

## Local operation

Start the full application:

```bash
corepack pnpm@9.15.3 dev
```

Build only the reusable handler package:

```bash
corepack pnpm@9.15.3 --filter @repo/api build
```

There is no command for starting `packages/api` as a separate service.

## API base URL

The browser uses same-origin `/api` routes when `NEXT_PUBLIC_API_URL` is unset.
The optional setting can redirect browser API requests, but this repository
does not provide a separate HTTP server for that deployment model.

See [API reference](api-reference.md) and [deployment](deployment.md).
