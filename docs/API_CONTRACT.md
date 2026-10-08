# API contract and evidence

The server uses Qloo directly over HTTPS. Interface details were checked against Qloo's own [public documentation mirror](https://github.com/qloo/docs-public), revision `d4a0eb978518f7fb404993d1509d11b21239ada6`, on 2026-10-08. The main documentation host was inaccessible in this build environment. This document records interface review, not a successful live integration test.

## Upstream calls

| Purpose | Request | Evidence |
| --- | --- | --- |
| Resolve a user-selected favorite | `GET /search?query=...&types=urn:entity:movie&take=12` (also artist/book) | [Entity search](https://github.com/qloo/docs-public/blob/main/reference/get-search.md) |
| Get a category's candidates for one profile | `GET /v2/insights?filter.type=urn:entity:book&signal.interests.entities=<comma-separated UUIDs>&filter.exclude.entities=<seed-and-rejected-UUIDs>&take=20` | [Recommendation insights](https://github.com/qloo/docs-public/blob/main/reference/basic-insights-use-case.md) |
| Authenticate | Server-only `X-Api-Key` header | [Onboarding](https://github.com/qloo/docs-public/blob/main/reference/api-onboarding.md) |

Default origin is `https://api.qloo.com`. Use an alternate allowed event host only when Qloo's credential instructions tell you to. Credential scope, endpoint access, quotas and actual response behavior must be tested with the assigned credential. No fallback host or key is used.

`entity_id`, `name` and the `subtype` identify results. The adapter accepts the documented entity envelope and normalizes UUID case. Live results must include valid UUIDs, the requested category and bounded metadata; incompatible payloads fail with a safe error. Entity IDs are used to merge returned lists; no description, image or computed affinity field is required. Only IDs, names, categories and optional disambiguation text enter the client response. Our local score uses list position, not an upstream probability.

## Local API

- `GET /api/config`: whether a usable-looking live configuration is present, default mode, maximum seed count. This is configuration detection, not authentication verification.
- `GET /api/search?mode=demo|live&type=movie|artist|book&q=...`: results explicitly carry `curated-demo` or `qloo-live` provenance.
- `POST /api/plan`: accepts two seed profiles, mode, minutes (30/60/90), focus (balanced/adventurous) and excluded IDs. Returns selected steps, ranked alternatives, trace, warnings, provenance and allocated minutes.

The precise TypeScript contract is in `src/shared.ts`, input validation in `server/app.ts`. Known failures use `{ "error": { "code": "...", "message": "..." } }`; upstream bodies and credentials are never echoed.

## Live verification still required

1. Obtain an individually attributable event key through the official event's linked process.
2. Configure it locally in `.env`, restart, and confirm live search resolves the intended works (including ambiguous names).
3. Search movie, artist and book categories and generate a three-domain plan, compare the displayed IDs/ranks with authorized redacted upstream responses, and skip a selection.
4. Optionally run `npm run test:live` against the local production server. It performs real calls and consumes quota. It requires one exact title match for each search instead of guessing among ambiguous results. This is still a transport/contract smoke test, not a substitute for entity disambiguation review.
5. Record actual date, host, outcomes and redacted evidence in `docs/VALIDATION.md`. Do not add keys, private account data or unrestricted raw payloads to the repository.

## Feedback and resource limits

Both profiles’ seed IDs and rejected IDs enter `filter.exclude.entities` on every live recommendation request. Local filtering and verification remain a second guard. Qloo can therefore return candidates beyond a previous top-20 window; the current returned list defines the displayed rank. Ranks are not a stable metric for comparing separate requests. Duplicate seed and exclusion IDs are normalized; conflicting categories for one ID are rejected.

The per-application provider has two active slots, at most sixteen queued operations, and an operator-configurable rolling-minute attempt budget (default 30). Retries count. These are application safety limits, not claimed event entitlements; multi-process deployments require shared enforcement. Requests have a configurable overall deadline (default 45 seconds) and a 10-second per-attempt timeout. Disconnects cancel queued and active work. Long upstream retry windows trigger a shared cooldown and an explicit error rather than an early retry. API responses specify `Cache-Control: no-store`.
