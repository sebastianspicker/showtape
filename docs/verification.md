# Local verification and optimization measurements

Everything below was measured with deterministic services and local production
builds. It does not measure live setlist.fm or Apple Music performance.

## Matching scheduler

The controlled variable-latency fixture compares five-request batch barriers
with five replenishing workers. Both keep at most five requests active.

| Songs | Batch barriers | Replenishing workers |
| ----- | -------------- | -------------------- |
| 20    | 400 ms         | 140 ms               |
| 50    | 1,000 ms       | 330 ms               |
| 100   | 2,000 ms       | 600 ms               |

These are virtual-clock results from `tests/workflow/matching-workers.test.tsx`,
so they show queue utilization rather than predicting network latency.
`matching-row-renders.test.tsx` checks that selection and manual-search changes
update only the affected memoized row, without rerendering all 20, 50, or 100
rows. Browser performance fixtures record real completion and interaction times,
request count, and peak concurrency for the same list sizes in Chromium and
WebKit. Their timings are diagnostic; the correctness assertions cover the
five-request bound, completion, interaction, and viewport overflow.

The production browser fixture run recorded these wall-clock times. Interaction
includes Playwright actionability and assertion overhead, so it is not an input
latency or INP measurement.

| Browser  | Songs | Completion | Skip interaction | Peak requests |
| -------- | ----- | ---------- | ---------------- | ------------- |
| Chromium | 20    | 1,160 ms   | 656 ms           | 5             |
| Chromium | 50    | 1,646 ms   | 737 ms           | 5             |
| Chromium | 100   | 1,840 ms   | 540 ms           | 5             |
| WebKit   | 20    | 1,089 ms   | 525 ms           | 5             |
| WebKit   | 50    | 992 ms     | 319 ms           | 5             |
| WebKit   | 100   | 1,639 ms   | 530 ms           | 5             |

## Initial loading

Ten cold browser contexts were measured for each production loading variant on
the same local machine with the same viewport and fixtures on 7 September 2026.
Other local workloads contributed timing variability.

| Variant              | Median ready time | Range        | Initial scripts | Observed transfer bytes                 |
| -------------------- | ----------------- | ------------ | --------------- | --------------------------------------- |
| Eager stages         | 625 ms            | 549–827 ms   | 8               | 290,197                                 |
| Lazy matching/export | 731.5 ms          | 572–1,228 ms | 7               | 281,764 normally; 291,273 in one sample |

Lazy stages remove one initial script request and roughly 8.2 KiB from the usual
initial transfer. The latency samples do not establish an improvement, so the
lazy boundaries are kept for deferred stage loading and accessible progress — no
startup speed improvement is claimed. The serif, sans-serif, and monospace fonts
and their preloads are unchanged.

## Verification boundaries

The browser suites use the production build and simulated API/MusicKit
responses. CSP tests cover static HTML reuse, distinct response nonces,
hydration, navigation, script blocking and nonce allowance, emitted error
documents, runtime-rendered errors, and missing or mismatched manifests.

Swift tests consume the shared domain corpus and inject networking, catalog,
authorization, mutation, and persistence behavior. Native UI fixtures require an
explicit Debug launch argument. Live Apple authorization, subscriptions, playlist
writes, registered bundle identifiers, signing, and deployment all need separate
configured-device verification.

Native import and preview audits run every available accessibility check except
the installed SDK's contrast audit. That audit also reports failures for visibly
black SwiftUI song numbers and sidebar labels on white; inspecting its own element
screenshot found foreground RGB (4, 4, 4) against approximately (253, 253, 253),
over 19:1 contrast. Contrast is therefore inspected separately from rendered
screenshots and is not counted as a passing automated check. The primary indigo
button measured approximately 5.1:1 against its white label, and secondary copy
was changed to primary text to improve legibility.

## Final local checks

The web gate is defined in [AGENTS.md](../AGENTS.md#commands) and runs in CI on
Node.js 20 and 22; test counts are not recorded here because they change with
the suite. The browser suite runs against the production artifact.

The Swift package passed 28 tests, including shared TypeScript/Swift fixtures,
bounded networking, cancellation, authorization, catalog concurrency, storage
failure, record expiry, exact recovery, and unknown mutation outcomes. Ten native
UI scenarios per simulator destination passed across the workflow and focused
accessibility runs on iPhone 17 Pro and iPad Air 13-inch (M3), using explicit
Debug fixtures on iOS 26.5. These cover import, preview, manual replacement,
skip/back preservation, export, partial resume, unknown outcomes, permission
denial, storage failure, cancellation, and background interruption.
Accessibility coverage carries the contrast exception described above.

Xcode 26.6 built both native Release targets without signing, including arm64 and
x86_64 for macOS. The backend configuration guard rejected missing and HTTP
Release URLs. Minimum deployment targets remain iOS 17 and macOS 14; those older
OS versions were not available for runtime verification here.

Mac UI test execution remains unverified: two sequential XCTest runs timed out
while enabling host automation before running any tests. The UI-control connector
also reported no window, while a direct WindowServer inspection and a captured
screenshot confirmed the native Import window was visible. That is launch and
rendering evidence, not proof of the complete Mac interaction suite. The normal
SwiftUI singleton `Window` remains in use; no custom launch bridge or
operating-system permission change was added.
