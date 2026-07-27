# Reliability

## Request ordering

Setlist import aborts the previous browser request and assigns each request a
numeric identifier. A late response cannot replace the latest request result.

Automatic matching processes songs in batches of five. It shares duplicate
queries within a run, ignores stale runs, and only fills rows that remain
unmatched. Manual search also uses a run identifier so a closed or replaced
search cannot update the active panel.

## External service controls

The setlist proxy:

- enforces a 10 second total upstream timeout;
- validates the minimum successful response shape;
- coalesces concurrent requests for the same setlist ID;
- caches successful responses for one hour, up to 200 entries;
- retries HTTP 429 at most twice with bounded delays and jitter;
- limits successful cacheable bodies to 500,000 serialized characters;
- limits upstream response reads to 10 MiB.

The Apple developer token is valid for one hour. The browser caches it for 55
minutes and shares an in-progress refresh request.

## Playlist writes

Tracks are added in batches of 100. A definite failure can retain the exact
remaining IDs. A transport rejection is treated as an unknown external outcome
and cannot be retried automatically.

## Process limits

Setlist caching and rate limiting are in memory. Restarting the process clears
them, and multiple processes do not share them. The application has no durable
queue, database, offline path, or background retry worker.
