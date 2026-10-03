# Deployment and configuration

## Configuration

For local development, copy `.env.example` to `.env`. In production, pass the
same values through the process environment and keep secrets out of the
repository, logs, and anything the browser can read.

| Variable                         | Requirement                             | Purpose                                                                      |
| -------------------------------- | --------------------------------------- | ---------------------------------------------------------------------------- |
| `SETLISTFM_API_KEY`              | Required for live imports               | Server-side setlist.fm API key.                                              |
| `APPLE_TEAM_ID`                  | Required for live Apple use             | Apple Developer team used to sign the developer token.                       |
| `APPLE_KEY_ID`                   | Required for live Apple use             | MusicKit private-key identifier.                                             |
| `APPLE_PRIVATE_KEY`              | Required for live Apple use             | PEM private key; literal `\n` sequences are accepted.                        |
| `NEXT_PUBLIC_APPLE_MUSIC_APP_ID` | Required for live Apple use             | Browser-visible MusicKit application identifier, incorporated at build time. |
| `ALLOWED_ORIGIN`                 | Required for a non-local browser origin | Comma-separated exact CORS origins, without wildcard or `null`.              |
| `TRUST_PROXY`                    | Optional                                | Set to `1` only behind a proxy that replaces forwarded client-IP headers.    |

Account setup and service-specific behavior are covered in the
[Apple Music integration](tech/apple-music.md) and
[setlist.fm integration](tech/setlistfm.md) guides.

The browser only ever calls this application's same-origin `/api` paths. There
is no alternate browser API URL and no independently deployable API service.

## Local operation

From the repository root:

```bash
cp .env.example .env
corepack pnpm@9.15.3 install --frozen-lockfile
corepack pnpm@9.15.3 dev
```

The app is available at `http://localhost:3000`. When `ALLOWED_ORIGIN` is unset,
API CORS permits only exact plain-HTTP origins on `localhost` or `127.0.0.1`.

## Running the live application

This repository supports one self-hosted Next.js process:

```bash
corepack pnpm@9.15.3 install --frozen-lockfile
corepack pnpm@9.15.3 build
corepack pnpm@9.15.3 start
```

The installed Next.js version requires Node.js 20.9 or later. Set
`NEXT_PUBLIC_APPLE_MUSIC_APP_ID` before you run `build`; the remaining values
must be available to the running process.

The repository does not ship a container image, process supervisor, reverse
proxy, deployment workflow, monitoring setup, or rollback automation. Choose and
document those in your own environment.

### Reverse proxy requirements

Terminate TLS before the Next.js process and preserve the request origin. Set
`ALLOWED_ORIGIN` to every exact browser origin that may call the API.

Leave `TRUST_PROXY` unset for direct deployments. Set `TRUST_PROXY=1` only when
the proxy removes client-supplied forwarding headers and writes trusted
`X-Forwarded-For` or `X-Real-IP` values; otherwise clients can evade or influence
per-client limiting. Without a trusted client key, the routes stay available but
report:

```text
X-RateLimit-Policy: disabled-direct-no-trusted-client-key
```

An independent setlist.fm admission policy remains active in direct deployments.
After cache hits and identical in-flight IDs are coalesced, each process admits
at most 32 distinct upstream operations concurrently and 120 new operations per
minute. Retries stay within the admitted operation rather than spending another
admission.

Setlist caches and rate-limit buckets live in process memory. Restarts clear
them, and multiple processes do not share them.

### Health and integration checks

After deploying, check that the process is alive:

```bash
curl --fail --silent https://your-app.example.com/api/health
```

A successful response only proves the Next.js route is running. Before calling
the service operational, separately exercise a live setlist import, MusicKit
loading and authorization, catalog matching, playlist creation, and a playlist
track write in the target browser and account. When reviewing proxy logs, keep
authorization headers, tokens, account identifiers, and user data out of what
you share.

## Static demo

The GitHub Pages artifact is a separate, simulated workflow. Build it with:

```bash
corepack pnpm@9.15.3 demo:check
corepack pnpm@9.15.3 demo:build
```

`demo:check` creates and validates a temporary artifact without keeping it.
`demo:build` writes the ignored `dist/pages` directory. The artifact contains
only the allowlisted demo HTML, CSS, JavaScript, shared global stylesheet,
Showtape mark, the tour screenshots from `docs/screenshots`, and `.nojekyll`.
Its content-security policy and build check reject network access, MusicKit,
navigation, and persistent browser storage.

This repository intentionally has no Pages deployment workflow. A separate
`sebastianspicker.github.io` host workflow checks out a reviewed, immutable
Showtape revision, rebuilds the artifact, and stages it at `/showtape/`. Pushing
this repository does not publish the demo; advancing the host's pinned
`SHOWTAPE_REF` and validating the combined host artifact are separate release
actions.

To regenerate the tour screenshots, run
`corepack pnpm@9.15.3 screenshots` (it needs a Playwright Chromium install and
rebuilds the demo artifact first).

## Verification boundary

CI checks production dependency advisories, public-tree hygiene, formatting,
linting, architecture boundaries, types, the production build, Vitest contracts,
and the static demo contract on Node.js 20 and 22. It does not deploy the live
application or run a complete browser journey against either external service.

## Static documents and content security policy

Next.js 16.3 (currently 16.3.8) runs with Turbopack. The home, privacy, and terms pages
are prerendered. `pnpm build` must finish both `next build` and
`scripts/generate-csp-manifest.mjs`; running `next build` alone leaves the build
incomplete.

The second step reads inline script bodies from the emitted HTML, hashes their
exact UTF-8 bytes, and writes `.next/csp-manifest.json` containing a schema
version, build ID, document digests, and deduplicated SHA-256 hashes. Available
static error documents are included. Missing expected pages, unsupported
extraction, static nonces, inline script attributes, and a policy larger than
8 KiB all fail the build.

The server validates the manifest against the build ID and the actual HTML at
startup and whenever a runtime module initializes. A failed validation returns a
plain-text, non-cacheable 503 for document requests. Deploy the whole `.next`
build — manifest and assets included — atomically; never edit or replace files
inside a running build. Restart after replacing an artifact, and roll back HTML,
assets, and manifest together.

Static inline scripts use the generated hashes. Each response also gets a fresh
server-generated nonce, which is forwarded to Next for runtime error rendering.
The proxy replaces inbound nonce and CSP headers. Script attributes are
prohibited, and the production script policy includes neither `unsafe-inline`
nor `unsafe-eval`. Existing inline style support is handled separately from the
script policy. Document responses use `private, no-store` plus explicit CDN
no-store headers, even though Next reuses prerendered HTML internally.

This hybrid policy is application-specific. The
[Next.js CSP guide](https://nextjs.org/docs/app/guides/content-security-policy)
explains that nonces alone force dynamic rendering; Showtape's static scripts
depend on build-time hashes instead, not on a nonce in the static HTML. This
does not enable experimental SRI or change bundlers.

For every Next.js upgrade: read the bundled CSP and rendering guides, regenerate
the manifest, verify all emitted documents and the policy size, and run the
production Chromium and WebKit tests. Check hydration, navigation, error pages,
rejected injected scripts, fresh response nonces with identical HTML, and
fail-closed startup with missing or mismatched artifacts before you ship.

## Native clients

See [native setup](../native/README.md) for Xcode targets, MusicKit account
configuration, and local testing. `SHOWTAPE_API_BASE_URL` is a native build
setting that points at this same Next.js service. Native requests without an
`Origin` header are accepted without emitting a browser CORS allowance, so
browser CORS and its same-origin API model are unchanged. Native clients use
only the setlist endpoint; native MusicKit handles Apple token management.
