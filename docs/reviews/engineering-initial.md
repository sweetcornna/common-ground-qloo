# Independent engineering review — initial

Reviewed 2026-10-08. Scope: server provider, request validation, planner, relevant client cancellation, process scripts, container/static serving, dependency scripts, existing tests. No real key was accessed or used. All transport reproductions below stubbed `globalThis.fetch` with synthetic responses; they do not validate live Qloo behavior.

## Findings requiring correction

### ENG-1 — Medium: concurrency is bounded per plan, not per shared credential

Evidence: `server/app.ts:21-22,33` creates a provider per request and limits only incoming requests per IP. `server/agent.ts:32-35` runs two calls concurrently per plan. A `supertest` reproduction issued ten simultaneous valid live-mode plans against one app with a dummy key and a 20 ms delayed synthetic fetch. It observed **60 upstream calls, peak 20 simultaneous calls**. All ten requests were below the 45/minute incoming limit. Multiple clients multiply this further. The public application's shared account therefore has no actual upstream concurrency or process-wide consumption limit.

Fix: create one shared upstream scheduler/provider per app, bound in-flight operations and pending work, apply a configurable global request budget, and reject overload with a safe recoverable error. Count actual fetch attempts, including retries. Test multiple simultaneous API requests, queue exhaustion, and permit release on failure/cancellation. Document single-process limits and deployment requirements.

### ENG-2 — Medium: Retry-After is violated and quota errors trigger another request

Evidence: `server/provider.ts:60-66` clamps upstream Retry-After to two seconds, then retries 429. A stub returning `429` and `Retry-After: 60` on each call produced a second call after **2,003 ms**, not 60 seconds. This wastes quota and ignores an explicit upstream retry window. Provider recreation also means independent requests cannot share a cooldown.

Fix: avoid automatically retrying quota responses (or honor a shared cooldown); if a requested wait exceeds the local latency budget, fail promptly with a rate-limit error and a safe Retry-After response rather than retrying early. Retain at most one retry for suitable transient failures. Tests should cover numeric and HTTP-date Retry-After, exhausted quota, concurrent callers, and retry accounting.

### ENG-3 — Medium: disconnected requests keep consuming upstream calls

Evidence: `server/app.ts:28,33` does not propagate a disconnect signal; `server/provider.ts:3-6,58` has only an internal timeout. A real local HTTP request to `/api/plan` was destroyed after the first two stubbed upstream calls began. **All six calls still ran**, including the four later category calls. Client search does abort its fetch (`src/App.tsx:163-185`), but this cannot stop work already executing on the server.

Fix: connect HTTP disconnect/response-close to an AbortController, pass the signal through the planner and provider, stop scheduling new calls/retries, abort queued work and active fetches, and clean up listeners. Test both client-disconnected searches and plans, including cancellation during retry delay. Ensure abort does not trigger a transient-failure retry. A sibling failed request should cancel unnecessary remaining work where practical.

### ENG-4 — Medium: duplicate preferences are accepted as distinct inputs

Evidence: `server/app.ts:9-15` validates lengths and live UUID format but not seed uniqueness. The demo provider hashes the full seed array (`server/provider.ts:20-23`), and live mode forwards duplicate IDs (`server/provider.ts:80`). A valid request with person A's first seed duplicated passed `planSchema`; its selected IDs changed from `[artist-nujabes, movie-moonrise-kingdom, book-a-psalm-for-the-wild-built]` to `[artist-nina-simone, movie-spirited-away, book-piranesi]`. Merely repeating the same preference changes the result. The UI prevents this normally, but exported requests and API consumers do not.

Fix: canonicalize/deduplicate each profile by case-normalized ID or reject duplicates with a clear 400. Reject conflicting metadata/types for a repeated identity rather than silently treating it as a second preference. Deduplicate excluded IDs. Test mixed-domain profiles, case variants and the same entity shared between people (which is legitimate).

## Verified checks and positive boundaries

- Existing `npm test`: **17 passed**. These tests did not catch the four reproductions above.
- `npm run typecheck`: passed.
- `npm run build`: passed.
- Production-mode local app checks: `/` and a deep link served HTML; a built JS asset served JavaScript; unknown `/api` returned JSON 404. `/.env` returned SPA HTML, not an environment file.
- Secret is server-side, excluded by git/docker rules, never sent in query parameters or config output. No user secret was inspected. HTTPS host allowlist and redirect refusal prevent arbitrary credential forwarding.
- Strict plan body schemas, 20 KB input cap, bounded strings, enum budgets, generic error messages and React text rendering are useful protections.
- No silent live-to-demo fallback was found. Empty categories and complete exhaustion are handled; selected and rejected IDs are filtered from alternatives.
- Internal fetch timeout is 10 seconds and retries are bounded to one; malformed JSON and auth failures are sanitized.
- Production startup defaults to loopback; container explicitly binds all interfaces and uses a non-root user. Proxy trust remains an operator responsibility described in privacy docs.

## Limits

Live credentials, actual Qloo responses/quotas, public-host proxy behavior, clean archive installation and deployed browser flows were not exercised by this reviewer. Other reviewers/parent own official contract review, UI/a11y and final clean-install verification. No source code was changed by this review; generated build output was refreshed by the build check. Findings should be rechecked after implementation, not marked resolved solely from a proposed fix.
