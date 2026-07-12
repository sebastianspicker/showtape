# Product Requirements Document – Setlist to Playlist

**Version:** 1.1 (public alpha)

**Updated:** 2026-07-11

---

## Overview / Vision

Setlist to Playlist is a network-only public-alpha web app that turns one
setlist from [setlist.fm](https://www.setlist.fm) (by URL or setlist ID) into an
**Apple Music** playlist in the user's account. The workflow route is `/`, with
`/privacy` and `/terms` available as supporting public pages. The user pastes a
link, reviews and optionally corrects track matches, then creates a playlist in
one flow—no account on our side and no manual copy-paste into Apple Music.

---

## Problem Statement

Concert-goers and fans want to listen to the exact setlist of a show. setlist.fm holds crowd-sourced setlists, but turning that into a playable playlist (e.g. in Apple Music) is manual and tedious. We want one flow: paste a setlist URL or ID, review and optionally fix track matches, then create the playlist in the user's Apple Music library.

---

## Users

- **End user:** Music fan with an Apple Music subscription. They discover a setlist on setlist.fm and want a playlist in their library. No account or sign-up on our service; they use Apple Music (MusicKit) for identity and playback only.

---

## Goals and Non-Goals

**In scope (MVP):**

- One URL or setlist ID in; preview of artist, venue, date, and ordered tracks.
- For each track, suggest an Apple Music match; user can confirm or manually correct/search.
- On confirmation, create an Apple Music playlist and add the selected tracks in order.
- Keep a browser-only, recognizable history of recent imports. A history v2
  record has `input`, `setlistId`, `artist`, `venue`, and `date`. Valid v1
  string entries migrate once with their `input`; their metadata is filled only
  after re-import.

**Out of scope (MVP):**

- Multiple setlists in one session, merge setlists, or batch import.
- Persisting setlists or playlists on our side; no user accounts on our platform.
- Offline use: this alpha has no service worker and all workflow stages require network access.
- A separate `/demo` route or static showcase workflow.

---

## User Stories

- As a user, I can paste a setlist.fm URL (or setlist ID) and see the setlist (artist, venue, date, tracks).
- As a user, I can see suggested Apple Music matches for each track and correct or search for a different track.
- As a user, I can create an Apple Music playlist with the matched tracks in setlist order.
- As a user, I am not required to create an account on our service; I use my Apple Music account only.
- As a repeat user, I can recognize a recent import from its locally stored metadata and re-import it without creating a service account.

## New User Onboarding (first-session expectations)

1. Open app and read short 4-step explanation.
2. Paste setlist URL or ID.
3. Review imported setlist and continue to matching.
4. Connect Apple Music when needed.
5. Create playlist and optionally open it in Apple Music.

---

## User Flow

1. **Import** – User enters setlist.fm URL or setlist ID.
2. **Preview** – App shows artist, venue, date, and ordered list of tracks.
3. **Match** – For each track, app suggests an Apple Music match; user can accept or change/search.
4. **Create playlist** – User clicks "Create playlist"; after Apple Music authorization if needed, the playlist is created and tracks are added in order.

**Error handling:** Invalid URL/ID or setlist not found → clear message. No match for a track → user can search manually or skip. Apple Music auth failed or revoked → prompt to re-authorize.

The import, preview, matching, and export states are the same real workflow
used for release screenshots. Public screenshots must use deterministic fixtures
or controlled upstream responses; they must not represent a fabricated demo
route. Live Apple Music authorization and end-to-end accessibility verification
remain pending until executed and recorded.

---

## Success Criteria

- User can complete the flow (import → preview → match → export) for a typical setlist in under a few minutes.
- No secrets (API keys, Apple private key) exposed to the client.
- Public-alpha screenshots are deterministic captures of real workflow states.
- Accessibility target is WCAG 2.2 AA. Mocked Chromium keyboard, reflow, and
  serious/critical axe checks pass locally; Safari/VoiceOver and credential-backed
  end-to-end checks remain owner-run release evidence.

### Evaluation Signals

The local public alpha does not include analytics. If privacy-reviewed
measurement is added later, evaluate:

- **Completion rate:** % of users who start (enter URL) and finish (playlist created).
- **Time to playlist:** Median time from URL entry to playlist created.
- **Match quality:** % of tracks auto-matched without user correction (informational; corrections are expected).
- **Reliability:** API uptime and setlist-proxy success rate.

---

## Risks and Mitigations

| Risk                                        | Mitigation                                                                     |
| ------------------------------------------- | ------------------------------------------------------------------------------ |
| setlist.fm rate limits / API availability   | Proxy caches responses (1 h TTL); backoff on 429; clear error message to user. |
| Apple Music catalog gaps (live/rare tracks) | Show "No match"; allow manual search or skip.                                  |
| User revokes MusicKit authorization         | Detect auth errors; show clear re-auth prompt.                                 |

---

## Dependencies / Integrations

- **setlist.fm API:** Fetch setlist by ID (or parse ID from URL). API key used server-side only (proxy). See [setlist.fm (tech)](../tech/setlistfm.md).
- **Apple Music:** MusicKit JS in the client; Developer Token from our API (JWT, server-side); User Token from MusicKit after user authorizes. See [Apple Music (tech)](../tech/apple-music.md).

---

## References

- [ARCHITECTURE.md](../../ARCHITECTURE.md) – Components, data flow, token handling
- [Product specs index](./index.md)
- [Tech docs](../tech/) – frontend, backend, Apple Music, setlist.fm, security, reliability
- [ADR 0001 – Stack (Next.js + MusicKit)](../adr/0001-stack-nextjs-musickit.md)
