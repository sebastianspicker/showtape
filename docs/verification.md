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

These are virtual-clock results, so they show queue utilization rather than
predicting network latency. Browser performance fixtures record real completion and interaction times,
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

Live Apple authorization, subscriptions, playlist writes, and deployment all
need separate verification.

## Final local checks

The web gate (format, lint, architecture, typecheck, build, demo contract) runs
in CI on Node.js 20 and 22.
