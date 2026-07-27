# Product

## Purpose

Showtape creates an Apple Music playlist from one public setlist.fm setlist. The
workflow has four stages: import, preview, match, and export.

## Users

The primary user has a setlist.fm URL or ID, an Apple Music subscription, and a
need to review catalog matches before writing to an Apple Music library.

The workflow must remain usable with a keyboard, visible focus, browser zoom,
reduced motion, and assistive technology. Automated Chromium checks cover part
of this target. Safari, VoiceOver, and live account behavior require separate
manual checks.

## Product rules

1. Present one current task and one next action.
2. Preserve setlist order.
3. Distinguish pending, matched, skipped, failed, partial, and completed states.
4. Preserve valid manual corrections when asynchronous searches finish.
5. Require confirmation before an external playlist write.
6. Do not retry a write when the external outcome is unknown.
7. Keep the setlist.fm attribution link visible while upstream data is shown.

## Data model

Showtape has no user account or application database. It stores recent import
inputs locally in the browser and short-lived export recovery state in the
current browser session. The server keeps a bounded, one-hour setlist cache in
process memory.

## Scope limits

The current application does not support multiple-setlist workflows, exports
outside Apple Music, offline operation, background synchronization, or a
separate demonstration route.

See [requirements](requirements.md) for implemented
requirements.
