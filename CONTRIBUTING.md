# Contributing

Thanks for helping. Please open an issue or start a discussion before you build
changes that touch the workflow, public interfaces, data retention, or
third-party integrations — it is much easier to agree on an approach first.

Repository conventions and layer rules are summarized in
[docs/architecture.md](docs/architecture.md).

## Development setup

Use Node.js 20.9 or later and run commands from the repository root. Node 25+
no longer ships Corepack; there, replace `corepack pnpm@9.15.3` with
`npx pnpm@9.15.3`.

```bash
cp .env.example .env
corepack pnpm@9.15.3 install --frozen-lockfile
corepack pnpm@9.15.3 build
```

Automated checks do not need live service credentials. Live setlist
import, browser accessibility work, and Apple Music operations do.

## Change requirements

- Keep each change focused.
- Preserve unrelated worktree changes.
- Add tests for behavior changes and regression fixes.
- Do not change public behavior only to satisfy an implementation-specific
  assertion.
- Keep credentials and user data out of source, sample data, screenshots, and logs.
- Avoid new dependencies when the current toolchain is sufficient.
- Update documentation when commands, configuration, routes, or behavior change.

## Validation

Run the full local gate before you request review:

```bash
corepack pnpm@9.15.3 format:check
corepack pnpm@9.15.3 hygiene:check
corepack pnpm@9.15.3 lint
corepack pnpm@9.15.3 check:architecture
corepack pnpm@9.15.3 typecheck
corepack pnpm@9.15.3 test
corepack pnpm@9.15.3 build
corepack pnpm@9.15.3 audit:security
corepack pnpm@9.15.3 demo:check
```

`demo:check` builds and validates a temporary static artifact. Use `demo:build`
only when you need an ignored `dist/pages` artifact locally.

For UI changes, inspect keyboard operation, focus movement, loading, empty,
error, and terminal states at both narrow and desktop widths.

## Screenshots

`docs/screenshots` holds the workflow stills used by the README and the static
demo. They are generated, not hand-edited — regenerate them with:

```bash
corepack pnpm@9.15.3 screenshots
```

That script builds the demo artifact, serves it locally, and drives it with
Playwright Chromium. Install the browser once with
`corepack pnpm@9.15.3 exec playwright install chromium`. Because
`demo:check` copies these files into the published artifact, a failed
`demo:check` can also mean a screenshot is missing or renamed.

## Pull requests

Include:

- the problem and the resulting behavior;
- compatibility or configuration impact;
- the exact validation commands and their results;
- screenshots when they help a reviewer inspect a visible change;
- a clear distinction between mocked tests and live integration checks.

Do not include credentials, private URLs, account identifiers, or personal data.
Use the repository pull request template.

Architecture changes must stay consistent with
[docs/architecture.md](docs/architecture.md) and the accepted
[application-boundary decision](docs/adr/0001-stack-nextjs-musickit.md).

## Security reports

Do not open a public issue for a vulnerability, exposed credential, or private
user data. Follow [SECURITY.md](SECURITY.md).

## Browser and native verification

The native app targets iOS/iPadOS 17 and macOS 14 with Swift 6. Follow
[native setup](native/README.md). For the local Xcode 26.6 workflow, pass
`DEVELOPER_DIR=/Applications/Xcode-26.6.0.app/Contents/Developer` per command;
do not change the machine's global Xcode selection. `fixtures/domain-parity.json`
is the single corpus shared by the TypeScript and Swift domain tests — update
both implementations and the shared expectations together when you intentionally
change a domain contract.
