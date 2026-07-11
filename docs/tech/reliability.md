# Reliability

- **Developer Token refresh:** `apps/web/src/lib/musickit/token.ts` caches the token for 55 minutes and uses a 5-minute validity buffer. Concurrent refreshes share one pending promise so expiry does not trigger duplicate dev-token requests.
- **setlist.fm import:** `useSetlistImportState.ts` aborts the previous request and uses numeric request IDs so late responses, including repeated submissions of the same input, cannot overwrite the latest setlist.
- **Automatic matching:** `useMatchingSuggestions.ts` searches Apple Music in batches of 5, shares duplicate in-flight queries within one run, and only fills rows that are still unmatched so manual corrections survive late auto-match responses.
- **Manual search:** `useTrackSearch.ts` keeps one active row at a time. Opening another row, choosing a track, or skipping the current row invalidates pending search results before they can update shared panel state.
- **Playlist export resume:** `useCreatePlaylistState.ts` stores only the remaining Apple Music song IDs in `sessionStorage`. Resume state is accepted only when the current selected IDs and duplicate-removal setting match the stored signature, and stale resume state is discarded after 30 minutes.
- **setlist.fm proxy:** The proxy caches successful responses, rate-limits callers, retries 429 responses with jitter, and returns structured errors without exposing stack traces.
- **PWA:** Offline export is intentionally unsupported because playlist creation requires network access and Apple Music authorization.
