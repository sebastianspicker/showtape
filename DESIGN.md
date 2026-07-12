# Setlist to Playlist Design System

## Overview

The interface is “The Working Setlist”: an opaque, tonal, static product surface for a four-step consumer workflow. Design serves recognition, correction, and safe playlist creation. It should feel ordered and calm rather than promotional.

## Design Principles

- Show only the active task and the context needed to complete it.
- Use text and structure as the primary information carriers.
- Keep the ordered setlist visually continuous; use dividers instead of card stacks.
- Reserve the blue accent for links, focus, and primary actions.
- Prefer familiar controls and content-sized layouts over ornamental abstractions.

## Color Palette

| Role                | Value                  | Usage                               |
| ------------------- | ---------------------- | ----------------------------------- |
| Canvas              | `#0B0E14`              | Page background                     |
| Surface             | `#131A24`              | Grouped content                     |
| Interactive surface | `#1A2431`              | Inputs and interactive rows         |
| Primary text        | `#F4F7FA`              | Headings and body text              |
| Muted text          | `#AAB6C4`              | Supporting text                     |
| Subtle divider      | `#2B3746`              | Row and section separators          |
| Control border      | `#5B6B80`              | Input and secondary control borders |
| Link/accent         | `#78B4FF`              | Links and informational accents     |
| Primary action      | `#2457C5`              | Primary buttons; hover `#1E4FB8`    |
| Focus ring          | `#8CC0FF`              | 3px focus outline with 2px offset   |
| Success             | `#54D6A0` on `#0F2A21` | Positive status                     |
| Warning             | `#F4C66A` on `#2B220F` | Partial or caution status           |
| Danger              | `#FF8C8C` on `#32171B` | Errors and destructive status       |

All combinations must meet WCAG 2.2 AA. Color never carries status without visible text.

## Typography

Use the system sans-serif stack throughout. H1 is 30px on desktop and 26px on mobile; H2 is 20px; H3 is 17px; body is 16px; support text is 14px. Heading line-height is 1.25 and body line-height is 1.5. Use fixed sizes, balanced headings, and prose lines no longer than 70 characters.

## Spacing and Layout

Use a `4, 8, 12, 16, 24, 32, 48px` spacing scale. The main workflow is at most 56rem wide; prose and forms are at most 42rem. Mobile gutters are 16px and increase to 24–32px. Matching is one ordered list: a three-column grid on desktop and content-sized stacked rows on mobile. Controls use 6px radii and grouped surfaces use 10px radii.

## Components

- Buttons have primary, secondary, and quiet treatments with default, hover, active, focus, disabled, and loading states. Loading always disables activation.
- Step headers own progress text, the active H2, context, and focus on step changes. Render one per active state.
- Error alerts use a full tonal background and border with a recovery action only when the operation is retryable.
- Form controls use explicit labels, hints, errors, a 44px minimum height, and the shared focus ring.
- Status text and chips pair a label or icon with color.
- Match rows use dividers, truthful pending/matched/unmatched/skipped text, and local progressive search controls.
- Terminal export results replace the editable export form; they are not nested as another card.

## Interaction and Motion

Transitions are limited to color, border, and opacity for 150ms. Reduced motion makes them effectively immediate. Step changes move focus to the active heading. Manual search focuses its input, supports Cancel and Escape, and returns focus to the originating control. External playlist creation is guarded against re-entry.

## Content Guidelines

Use state-specific, action-specific language. Prefer “Change setlist,” “Re-match all,” “Skip remaining,” and “Start another setlist” over vague or misleading copy. Pending rows say “Searching.” Never claim that every song was found unless every song is matched.

## Responsive and Accessibility Requirements

Support 320–1440px without horizontal overflow and remain operable at 400% zoom. Normal controls target 44px. Use semantic headings and ordered lists, visible focus, accessible names that include the song, one concise live progress region, and keyboard-complete behavior. Do not lock orientation.

## Prohibited Patterns

No gradients, decorative shadows, blur, fixed backgrounds, translated hover motion, glass panels, colored side stripes, display fonts, generic layout primitives, nested cards, or `premium-*` naming.
