# Release and submission checklist

This is the release handoff. Development and quality iteration are authorized. The API-key application was submitted in the parent task and is awaiting organizer approval. No key has been issued to this implementation team. The user subsequently authorized public source publication, public deployment and formal submission. The confirmed public source destination is [sweetcornna/common-ground-qloo](https://github.com/sweetcornna/common-ground-qloo). External deployment and formal submission remain pending; hosting account access and real Qloo validation are still required.

## Required operator inputs

- [x] Submit the API-key application through the [official resources page](https://qloo.devpost.com/resources), completed separately in the parent task.
- [ ] Receive organizer approval and the assigned credential; confirm permitted API host, access, rate limits and terms. Do not duplicate the pending application.
- [ ] Confirm whether the [official kit's API access guidance](https://github.com/qloo/qloo-hackathon-kit/blob/main/docs/API_ACCESS.md) requires a harness surface or approves this direct-HTTP LangGraph integration. Use an individually attributable event credential or an organizer-approved gateway.
- [ ] Set the key through a local ignored `.env` or the eventual host's secret manager. Never send it through chat.
- [ ] Provide explicit authorization for the chosen hosting and public-source destinations before those actions.
- [ ] Review entrant eligibility, ownership, AI disclosure and any needed organizer clarification using [the rules record](RULES_REVIEW.md).

## Live acceptance gate

- [ ] Install from the lockfile in a clean Node 22.19+ environment and run the checks in README.
- [ ] Start with a valid key; confirm live mode is available and no secret appears in client bundles, API responses, errors, screenshots or logs.
- [ ] Search a known movie, artist and book in live mode; verify real entity identifiers and types.
- [ ] Select real live search results for both people. Generate each supported duration with both ranking policies.
- [ ] Confirm Qloo supplies the candidate lists across all three domains and the UI displays live provenance.
- [ ] Inspect returned ranks and the application's score calculation against one captured, safely redacted run; do not publish an API response unless its terms allow that use.
- [ ] Reject a candidate; verify the next live plan excludes it. Inspect alternatives and insufficient-candidate behavior.
- [ ] Exercise invalid/missing key, empty result, timeout and rate-limit behavior. Confirm errors are clear and no demo fallback occurs.
- [ ] Record the environment, date, results and any compatibility fixes in `VALIDATION.md`; do not convert mocked passes into live passes.
- [ ] Optionally run `npm run test:live` against the locally running keyed server. This opt-in smoke test requires unique exact title matches in three domains and consumes at least 15 upstream attempts for a complete run. It is not a recommendation-quality study or a substitute for full UI validation.

## Publication gate — requires new authorization

- [ ] Review the final source for secrets, sensitive preferences and unused assets. Include `.env.example`, exclude `.env` and dependencies/build caches from the source archive.
- [ ] Confirm MIT licensing authority and required third-party notices.
- [ ] Publish the authorized public repository with the lockfile, all source, license and English run instructions.
- [ ] Deploy the Node build behind HTTPS using server-side secrets and an appropriate supported Node runtime; confirm reverse-proxy and rate-limit configuration.
- [ ] If using the supplied Dockerfile, build and verify the image yourself; container execution was not established by source creation. Enable and verify the supplied CI workflow after repository publication; local tests do not prove a remote CI run.
- [ ] Verify the public URL end-to-end from a fresh external browser. An offline-only deployment is not evidence of the required live Qloo integration.
- [ ] Check mobile layout, keyboard operation, loading/error states, refresh and direct page access.
- [ ] Review infrastructure access logs, quotas and retention; document the actual production privacy policy.
- [ ] Maintain judge access through **16 November 2026, 11:45 p.m. Eastern (EST), or 17 November 2026, 12:45 Beijing**; plan uptime and Qloo quota accordingly.

## Submission gate — entrant action / new authorization

- [ ] Confirm registration and any team representative details yourself.
- [ ] Replace pending links in `DEVPOST_SUBMISSION.md`; revise its validation section to match evidence.
- [ ] Review every statement, including AI assistance and ownership representations.
- [ ] Complete Devpost fields and submit before **31 October 2026, 03:45 UTC / 11:45 Beijing**.
- [ ] Verify the saved submission, public links, detectable license and English testing instructions. Keep a submission receipt and final source revision.

No completion of this checklist guarantees acceptance or a prize. See [official requirements and rules](RULES_REVIEW.md) for source links and the review date.
