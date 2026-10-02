# Security policy

## Supported versions

Security fixes go to the current `0.3.0-alpha` development line. Older snapshots
are unsupported.

## Reporting a vulnerability

Open a
[private GitHub security advisory](https://github.com/sebastianspicker/showtape/security/advisories/new).
Please do not open a public issue for a vulnerability, exposed credential, or
private user data.

Include the affected path or endpoint, the conditions that reproduce it, the
impact you observed, and whether credentials or external data may have been
exposed. Do not include live secrets. The repository does not promise a response
or disclosure timeline.

## Where credentials and tokens live

- `APPLE_PRIVATE_KEY`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, and `SETLISTFM_API_KEY`
  belong in the server environment.
- Treat every `NEXT_PUBLIC_*` value as browser-visible.
- The server hands the browser a short-lived Apple developer token so MusicKit
  can initialize.
- The MusicKit user token stays in browser state and is never sent to Showtape
  API routes.
- Keep credentials, authorization headers, account identifiers, private playlist
  URLs, and personal data out of source, fixtures, screenshots, issues, logs, and
  diagnostics.

## What is already in place

- API inputs are length-checked and parsed before any upstream call.
- Client and server response readers reject bodies larger than 10 MiB.
- Setlist responses are validated and mapped before they reach the browser, and
  upstream redirects are rejected.
- JSON responses apply exact-origin CORS plus `nosniff` and frame-denial headers.
- The page proxy applies CSP, HSTS, referrer, permissions, and related browser
  headers. The CSP allows the Apple MusicKit script and API origins the
  application needs.
- `ALLOWED_ORIGIN` rejects wildcard and `null` origins.
- Forwarded client-IP headers are ignored unless `TRUST_PROXY=1`.
- In-memory caches and rate-limit storage are bounded.
- GitHub Actions are pinned to full commit IDs. When you update one, review the
  upstream release and change the retained version comment along with the pin.

`corepack pnpm@9.15.3 hygiene:check` rejects common credential files, private-key
markers, local tool state, mutable Action references, reports, and absolute home
paths in the publishable tree. It is a repository-specific boundary check, not a
general secret scanner.

`corepack pnpm@9.15.3 audit:security` checks production dependencies at moderate
severity or higher.

## Operator responsibilities

Use TLS and restrict access to the process environment. Set `TRUST_PROXY=1` only
behind a reverse proxy that removes client-supplied forwarded-IP headers and
writes trusted values. Review application and proxy logs before sharing them.

The repository does not provide hosting, secret storage, centralized logging,
monitoring, backup, recovery, or incident-response infrastructure — operators are
responsible for those controls. See
[deployment and configuration](docs/DEPLOYMENT.md) for the supported process
boundary.
