# Security

## Credentials and tokens

- Keep `APPLE_PRIVATE_KEY`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, and
  `SETLISTFM_API_KEY` in the server environment.
- Treat `NEXT_PUBLIC_*` values as browser-visible configuration.
- The Apple developer token is returned to the browser for MusicKit.
- The MusicKit user token remains in browser state and is not sent to Showtape
  API routes.

## HTTP controls

- API inputs are length-checked and parsed before upstream calls.
- JSON responses apply exact-origin CORS, `nosniff`, and frame denial headers.
- Page middleware applies the content security policy, HSTS, referrer policy,
  permissions policy, and related browser headers.
- The content security policy permits the Apple MusicKit script origin.
- `ALLOWED_ORIGIN` rejects wildcard and `null` origins.
- Forwarded client IP headers are ignored unless `TRUST_PROXY=1`.

## Operational requirements

Use TLS, keep secrets out of logs and diagnostics, restrict process and
environment access, and configure the reverse proxy to replace forwarded-IP
headers before enabling proxy trust.

Run:

```bash
corepack pnpm@9.15.3 hygiene:check
corepack pnpm@9.15.3 audit:security
```

The hygiene check detects common local-state and credential patterns. It is not
a general secret scanner. The dependency audit covers production dependencies
at moderate severity or higher.

See the repository [security policy](../../SECURITY.md).
