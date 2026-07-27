# Interface Design

## Direction

The interface uses a dark page background, a light setlist surface, compact
serif headings, sans-serif body text, and monospaced order and status metadata.
The ordered song list remains the primary visual structure.

## Interaction rules

- Show one active workflow stage and one primary next action.
- Use continuous lists and dividers instead of a card for every song.
- Name loading, matching, authorization, write, partial, and error states.
- Move focus to the active stage heading after a stage change.
- Preserve manual match changes when returning to an earlier stage.
- Keep external writes behind explicit user action.
- Provide recovery guidance when a playlist write has an unknown outcome.

## Color tokens

The maintained tokens are defined in `apps/web/src/styles/globals.css`.

| Role                     | Token            | Current value |
| ------------------------ | ---------------- | ------------- |
| Page background          | `--stage`        | `#0e1116`     |
| Raised dark surface      | `--stage-raised` | `#161a22`     |
| Main content surface     | `--paper`        | `#f4f2ec`     |
| Raised content surface   | `--paper-raised` | `#faf9f6`     |
| Main text                | `--ink`          | `#12141a`     |
| Secondary text           | `--ink-muted`    | `#5c6470`     |
| Divider                  | `--rule`         | `#d8d4cb`     |
| Primary action and focus | `--cue`          | `#5b4dff`     |
| Success                  | `--success`      | `#1a6b52`     |
| Warning                  | `--warning`      | `#8a5a00`     |
| Error                    | `--danger`       | `#b12d3a`     |

Color must not be the only indication of state.

## Typography

- Display: Fraunces through `next/font`, followed by the declared serif
  fallbacks.
- Body and controls: Inter through `next/font`, followed by system sans-serif.
- Order, progress, and metadata: JetBrains Mono through `next/font`, followed by
  system monospace.

Uppercase monospaced text is reserved for short labels and metadata.

## Layout

The main application width is bounded and uses fluid gutters. The stage contains
the masthead, workflow progress, content sheet, and footer.

- Import uses a form and a short workflow explanation.
- Preview places show metadata above the ordered track list.
- Matching pairs the track list with a compact action summary.
- Export pairs the final selection with playlist actions.
- Legal and error pages use the same reading surface.

Two-column layouts collapse at 52rem. At 38rem, progress becomes a two-column
grid and controls may fill the available width. Content must not cause horizontal
page scrolling at 320 CSS pixels.

## Accessibility and motion

The implementation targets WCAG 2.2 AA, complete keyboard operation, semantic
landmarks and headings, visible focus, announced status changes, reduced-motion
support, and reflow at 400 percent zoom. Normal interactive controls target a
minimum height of 44 CSS pixels.

Automated Chromium checks reject serious or critical axe findings and selected
overflow failures. They do not replace manual screen-reader, browser, zoom, or
live-account testing.
