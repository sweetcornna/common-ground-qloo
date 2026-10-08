# Independent product and Qloo contract follow-up

Reviewed 8 October 2026 after the implementation changes. This reviewer did not edit application code. All executed upstream scenarios used an injected synthetic HTTP responder and a clearly dummy key; no real Qloo API call occurred.

## Initial findings closed

| Finding | Verified change | Independent evidence |
| --- | --- | --- |
| P1: feedback repeatedly exhausted an unchanged retrieval window | The planner passes the union of both profiles' seed IDs and rejected IDs to every recommendation call. The live adapter sends `filter.exclude.entities`; local exclusions remain enforced. Explanations identify current returned-list ranks and methodology specifies filtered live responses. | Executed a synthetic endpoint with 22 valid UUID entities per domain and a 20-item response window. After excluding the first 20 artist IDs, replanning retrieved item 21 at rank 1 rather than dropping the category. All six replanning calls contained both profiles' seed IDs and all exclusions. Total budget remained exactly 60 minutes. |
| P2: duplicate preferences changed input semantics | The endpoint trims/normalizes IDs, canonicalizes duplicate seeds separately per person, deduplicates exclusions, preserves overlap between people, and rejects conflicting category declarations. The live adapter also deduplicates the interests parameter. | Independently exercised mixed movie/artist seeds, a duplicate uppercase UUID, and an artist shared across participants. Each profile retained two distinct interests. Existing regression tests cover conflicting types, excessive distinct inputs and unchanged demo results after deduplication. |
| P3: live search entities could fail the next plan request | Both real transport methods use strict parsing: valid UUID, expected category, bounded nonblank name and bounded optional disambiguation. Malformed nonempty data fails explicitly instead of masquerading as a legitimate empty result. | Inspected strict-mode invocations; ran regression cases for malformed UUIDs, missing category and oversized names. Provider contract fixtures use valid UUIDs for live-shaped results. |

## Executed checks

- `npx vitest run tests/qa.test.ts tests/reliability.test.ts`: **29 passed**, two files, no failures, independently rerun at 07:45 UTC on 8 October 2026.
- Separate `node --import tsx --input-type=module` assertion scenario: **passed**. The synthetic provider parsed actual outgoing URL parameters, removed excluded IDs from 22-item category fixtures, returned at most 20, and drove the real planner twice. Twelve mocked HTTP calls; no network access or real credentials. This independently checked replenishment rather than merely asserting an argument was passed.
- Reviewed the official rubric mapping and judge guide. They tie technological implementation, design, potential impact and idea quality to actual code/evidence, and explicitly state missing live validation, public release and user research.
- Reviewed rule/application status: the parent submitted the key application; credential approval remains pending. The materials do not equate an application with API access or competition eligibility.

## Limits and remaining work

No known high- or medium-priority product/contract implementation issue remains in the inspected scope. A small wording refinement was sent to the owner: generic candidate reasons should say current returned lists, because offline fixtures are locally excluded rather than fetched through an upstream filter; the separate live-methodology sentence can retain exclusion-filtered wording. Documentation owners were also notified to synchronize `API_CONTRACT.md` and the live walkthrough with the new exclusion parameter and exact-match smoke behavior before packaging.

Real upstream entitlement, response compatibility under the entrant's issued credential, cultural quality and public-host behavior are still unverified. The rank heuristic is transparent but does not establish equitable satisfaction or individual liking probabilities. Repeated rejection is hard exclusion, not learned dislike. The deterministic LangGraph orchestration already performs consequential retrieval, comparison, allocation and verification; adding an LLM without a demonstrated need is not a useful closure criterion.

The remaining worthwhile acceptance work depends on credentials or authorized publication. Broader personalized learning, another data category or a new conversational layer would expand product scope rather than repair a known defect.
