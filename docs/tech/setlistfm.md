# setlist.fm Integration

## Configuration

Create a setlist.fm API application and set the issued key as:

```dotenv
SETLISTFM_API_KEY=your-setlistfm-api-key
```

The server sends the key in the `x-api-key` header to
`https://api.setlist.fm/rest/1.0`. The browser never receives it.

Use the current [setlist.fm API documentation](https://api.setlist.fm/docs/1.0/index.html)
and [API application page](https://www.setlist.fm/settings/apps) for account and
key setup.

## Accepted input

The application accepts:

- a 4 to 12 character hexadecimal setlist ID;
- a setlist.fm setlist URL containing such an ID.

`GET /api/setlist/proxy` accepts `id` or `url`. If both are present, `id` takes
precedence. The handler always calls the upstream setlist-by-ID endpoint.

## Response handling

Before returning or caching a successful response, the server verifies:

- the requested setlist ID;
- a nonempty event date;
- a nonempty artist name;
- that `set`, when present, is an array.

Songs marked `tape: true` are excluded from playlist mapping.

Successful responses are cached in process memory for one hour with a
200-entry limit. Concurrent requests for the same uncached ID share one
upstream request. The complete upstream operation has a 10 second timeout and
at most two bounded retries after HTTP 429.

## Attribution and terms

The browser displays the response attribution URL while imported data is shown
and uses the setlist.fm home page as a validated fallback. Operators must review
the current [setlist.fm Terms of Use](https://www.setlist.fm/help/terms) before
enabling the API key. The terms are maintained outside this repository and can
change independently.

## Local fixture seeding

The repository's seeding script fetches setlist ID `63de4613` and writes an
ignored local fixture:

```bash
SETLISTFM_API_KEY=your_key corepack pnpm@9.15.3 fixtures:seed
```

The command writes `scripts/fixtures/demo-setlists.json` only if at least one
request succeeds.
