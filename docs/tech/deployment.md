# Deployment

## Supported process

One self-hosted Next.js process serves the browser application and all API
routes.

```bash
corepack pnpm@9.15.3 install --frozen-lockfile
corepack pnpm@9.15.3 build
corepack pnpm@9.15.3 --filter web start
```

Node.js 20 or later is required. The repository does not provide a container
image, process supervisor, reverse-proxy configuration, or deployment workflow.

## Environment

Set these values in the process environment:

| Variable                         | Description                           |
| -------------------------------- | ------------------------------------- |
| `APPLE_TEAM_ID`                  | Apple Developer Team ID               |
| `APPLE_KEY_ID`                   | MusicKit key ID                       |
| `APPLE_PRIVATE_KEY`              | Full PEM private key                  |
| `NEXT_PUBLIC_APPLE_MUSIC_APP_ID` | Browser MusicKit application ID       |
| `SETLISTFM_API_KEY`              | Server-side setlist.fm API key        |
| `ALLOWED_ORIGIN`                 | Comma-separated exact browser origins |

Leave `NEXT_PUBLIC_API_URL` unset for the included same-origin routes.

`NEXT_PUBLIC_*` values are incorporated into the browser build. Set production
values before running `build`.

## Reverse proxy

Terminate TLS before the Next.js process and preserve the request origin.
Set `TRUST_PROXY=1` only if the proxy removes client-supplied forwarded-IP
headers and writes trusted `X-Forwarded-For` or `X-Real-IP` values.

Without a trusted client key, per-client route limiting is disabled and API
responses include:

```text
X-RateLimit-Policy: disabled-direct-no-trusted-client-key
```

The application still uses bounded in-memory caches and limiter storage. These
structures are per process and are not shared across instances.

## Health check

After deployment:

```bash
curl --fail --silent https://your-app.example.com/api/health
```

A successful response confirms that the Next.js route is running. It does not
verify Apple credentials, setlist.fm access, MusicKit authorization, or a
playlist write.

## Release boundary

CI verifies formatting, public-tree hygiene, linting, types, builds, tests,
production dependency audit, and mocked Chromium behavior. It does not deploy
the application.

Operators must provide revision selection, deployment, monitoring, credential
checks, and rollback procedures.
