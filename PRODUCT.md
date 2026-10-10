# Product and interface contract

## Who it is for

Showtape is for Apple Music subscribers who already have a specific concert
setlist and want it as an ordered playlist. It makes the uncertain parts — catalog
matching and external writes — visible instead of pretending they are automatic
or infallible.

The workflow has four stages:

1. Import one setlist.fm URL or ID.
2. Preview the event details, attribution, and ordered non-tape songs.
3. Review suggestions, search manually, replace matches, or skip songs.
4. Review the selection, authorize Apple Music, and create the playlist.

At least one selected track is required to export.

The web client and the native iPhone, iPad, and Mac clients share this workflow.
Native MusicKit access is requested before catalog matching and rechecked before
playlist writes. The native targets require iOS 17 or macOS 14.

## Product rules

- Keep one active stage and one clear next action.
- Preserve setlist order and any valid manual corrections.
- Keep setlist.fm attribution visible while imported data is displayed.
- Distinguish loading, unmatched, matched, skipped, failed, partial, unknown,
  and completed states in text, not only by color.
- Put playlist creation and track writes behind an explicit user action.
- Never offer an automatic retry when Apple Music may already have applied a
  write.
- Provide a useful recovery path when the exact remaining track IDs are known.

## Scope

The current alpha handles one setlist and one Apple Music playlist at a time. It
can remove duplicate selected Apple track IDs, remember eight recent import
inputs, and retain a known partial export for 30 minutes.

Not implemented:

- multiple-setlist import, merge, or batch processing;
- export services other than Apple Music;
- Showtape user accounts or a server-side user database;
- offline operation, a service worker, or background synchronization;
- automatic retry of an Apple Music write with an unknown outcome;
- a live demo route in the Next.js application.

The separate static demo is simulated and cannot verify live integration
behavior.

## Interface direction

The ordered setlist is the primary visual structure. The interface tapes one
textured paper sheet with deckled edges to a dark stage. A marker face is used for
the artist's name, the gaffer-tape wordmark, and the cassette label; headings and
body text use a sans-serif, and order numbers, event details, and status words
use a monospaced face. Red is the only accent: the wordmark, primary actions and
recording choices, red pencil marks under the artist and the current stage, and a
pencil circle around songs that still need a choice. Tape, stamps, and cassette
artwork give it character, but only where they do not compete with the song list:
the cassette appears on import and success, never next to the list, and is
decorative rather than a playback control. It avoids dashboard grids, stat cards,
and step labels that repeat the progress rail.

Use continuous lists and dividers instead of wrapping every song in a card. Move
focus to the active stage heading after a stage change. Preserve choices when
the user returns to an earlier stage, and explain external-write consequences at
the point of action.

The maintained color, type, spacing, and responsive tokens live in
`src/styles/globals.css`; that file is the source of truth for exact values.
Reusable controls live in `src/ui`, while workflow-specific presentation stays
with its feature under `src/workflow`.

The native clients use system typography and controls around the same ordered
song list. iPhone uses stack navigation; iPad and Mac use split navigation. The
Mac app has one primary window. Native appearance follows the system, with
Dynamic Type, accessibility labels, keyboard actions, and reduced-motion support
in the shared SwiftUI presentation.

## Accessibility and responsive behavior

The product targets WCAG 2.2 AA, complete keyboard operation, semantic landmarks
and headings, visible focus, announced state changes, reduced-motion support, and
reflow at 400 percent zoom. Normal interactive controls target a minimum height
of 44 CSS pixels. Content must not introduce horizontal page scrolling at 320 CSS
pixels.

The repository does not automate a complete browser accessibility or overflow
audit. UI changes need manual keyboard, screen-reader, zoom, reduced-motion,
narrow-viewport, and desktop checks in addition to the automated contracts.
