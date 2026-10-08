# Independent engineering re-review

Reviewed 2026-10-08 after the first engineering corrections and the follow-up response-body resource correction. Scope and credential restrictions match `engineering-initial.md`. This reviewer did not modify implementation code. No issued key was read; all upstream evidence uses synthetic fetch responses with dummy credentials.

## Outcome

**No known high- or medium-priority fixable engineering issue remains in the reviewed source.** All four initial findings are closed by implementation inspection plus reproduced behavior. This is a scoped review, not a claim of complete security or authenticated API readiness.

| Initial finding | Fix inspected | Independent recheck |
| --- | --- | --- |
| ENG-1: account-level concurrency absent | Shared per-app provider, `Governor` with two active operations, 16 queued operations and configurable rolling attempt budget | Ten concurrent HTTP plans with a delayed synthetic transport: maximum active fetches **2**, nine complete empty-result plans returned 422, one overloaded plan returned safe 503; total **54 calls**, rather than unbounded concurrency. |
| ENG-2: Retry-After truncated | Shared cooldown; long pauses fail fast without shortening them; retries count against budget | HTTP-date Retry-After approximately 60 seconds, followed immediately by another independent provider request: both returned `QLOO_RATE_LIMIT`, total **one fetch**. Numeric Retry-After coverage also passed in the regression suite. |
| ENG-3: disconnects continue work | Request close/deadline signals propagate through graph, admission queue, retry wait, fetch and response reader; planner aborts sibling work in `finally` | Real local HTTP client destroyed after first category started: **two fetches, both aborted; no later category calls**. A 100 ms configured plan deadline returned **408 / REQUEST_ABORTED**, aborted both active calls; a subsequent search returned **200**, proving permits were released. |
| ENG-4: duplicated seed alters output | Per-profile normalized-ID deduplication, distinct-seed cap, conflicting-category rejection, exclusion deduplication | Duplicating a seed with uppercase ID yielded identical complete plan steps to the original normalized request. Shared seeds across people remain legal; mixed categories are allowed. |

## Follow-up resource issue closed

During inspection, non-2xx response bodies were initially not consumed or canceled before releasing a governor slot. This was reported immediately. The current implementation cancels non-success bodies and bounds successful responses to 2 MiB while retaining the slot through consumption. Independent synthetic open-stream reproduction returned two HTTP 500 responses and observed **two stream cancellations**. New automated tests cover 401/404/429/500 cancellation, oversized streams and stalled successful-stream abort. No further change is requested for this issue.

## Additional coverage

- Inspected governor admission, queue removal on abort, reserved-slot handoff, check-at-admission and check-at-execution, retry accounting and invalid configuration rejection. Canceled work does not consume a future fetch slot.
- Reviewed deadline and disconnect cleanup, cancellation during retry waits, strict UUID/type/name response validation, no-store API responses and sanitized errors.
- Re-ran current `npm test`: **39 tests passed across three files** at review time, including 18 new reliability tests and the smoke-script tests. Counts may increase during final parent validation; the final validation document owns aggregate results.
- Earlier production checks and type/build checks are recorded in the initial report. Parent owns final build, full browser matrix, clean-archive installation and package verification after all concurrent work settles.
- No silent fallback, credential reflection or arbitrary outbound host selection was introduced. Limit errors remain explicit live errors.

## Remaining external conditions and low-return work

Authenticated Qloo contract behavior, actual issued-key endpoint permissions, real quota policy, recommendation quality and public deployment behavior still require the issued credential and authorized publication. Process-local guardrails are appropriate for the documented single-process deployment; a future multi-instance deployment needs shared enforcement, which is explicitly an operator responsibility rather than an undisclosed current guarantee. Absolute immunity to distributed abuse would require deployment-specific controls and is not a reason to invent accounts or rewrite this small local project now.

The source review found no evidence justifying a broader framework rewrite or an added LLM credential dependency. Remaining work belongs to external validation/publication gates and final packaging, not further speculative engineering changes.
