# setlist.fm integration

## Account setup

Create a setlist.fm API application and put its key in the server environment as
`SETLISTFM_API_KEY`. The current
[API documentation](https://api.setlist.fm/docs/1.0/index.html) and
[API application page](https://www.setlist.fm/settings/apps) cover account and
key setup. Neither client ever receives the key.

## Input and response boundary

Showtape accepts a 4 to 12 character hexadecimal setlist ID, or a setlist.fm URL
that contains one. `GET /api/setlist/proxy` accepts `id` or `url`; if both are
present, `id` wins.

The native URLSession client uses the same endpoint at its configured HTTPS
backend. Requests without an `Origin` header are accepted, but this does not
grant cross-origin browser access or change the browser's same-origin API model.

Before returning or caching a response, the server verifies the requested ID,
event date, artist name, and set structure, maps the upstream body to the smaller
domain `Setlist` shape, and removes songs marked as tape entries. It rejects
upstream redirects and responses larger than 10 MiB.

Successful mapped responses are cached in process memory for one hour with a
200-entry limit. Concurrent requests for the same uncached ID share one upstream
request. The whole operation has a 10-second deadline and at most two bounded
retries after HTTP 429. Reads refresh cache recency without extending the
original expiry. When a rate limit is exhausted, valid Retry-After guidance is
preserved, clamped to 1–60 seconds, in both the response header and the
client-visible error.

## Attribution

Both clients keep a validated setlist.fm source URL visible for as long as
imported data is shown, and fall back to the setlist.fm home page. Operators must
review the current [setlist.fm Terms of Use](https://www.setlist.fm/help/terms)
before enabling the API key, since those terms are maintained outside this
repository.
