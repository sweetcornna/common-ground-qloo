# Judging criteria: implementation evidence and gaps

The [official event overview](https://qloo.devpost.com/) lists four judging dimensions. This table is a navigation aid for reviewing Common Ground, not a prediction of scores or award likelihood. Only executed checks in [VALIDATION.md](VALIDATION.md) should be treated as test evidence.

| Criterion | Concrete implementation to inspect | Evidence | Remaining gap |
| --- | --- | --- | --- |
| Technological Implementation | Qloo entity search and per-profile cross-domain insights; LangGraph retrieval, negotiation, composition and verification; exclusion-driven replanning; explicit mode provenance. | [API contract](API_CONTRACT.md), [architecture](ARCHITECTURE.md), `server/provider.ts`, `server/agent.ts`, automated test record. | Real Qloo account acceptance testing and final public integration remain pending. Documentation review and HTTP mocks do not prove entitlement, actual response behavior or live quality. |
| Design | Two profile editors, short-session controls, recommendation evidence, alternatives, loading/errors, exports and a visible workflow trace. | [Judge guide](JUDGE_GUIDE.md), `src/App.tsx`, `src/styles.css`, screenshots and browser outcomes in the validation record. | Review the final revised interface on the published host. Local browser tests do not prove universal accessibility or behavior on every device. |
| Potential Impact | A specific use case: two people choosing a shared cultural sampling session while seeing how each person's taste is represented. | [Submission draft](DEVPOST_SUBMISSION.md), time allocation and documented rank policy, inspectable feedback loop. | No participant study, satisfaction result, retention metric or comparison against a generic recommender has been measured. A useful next test is whether pairs report feeling represented after the session. |
| Quality of the Idea | Cross-domain cultural retrieval serves a negotiation task, with explicit trade-offs and short activities instead of a flat recommendation list. | [Decision record](AI_ASSISTANCE.md), [request walkthrough](REQUEST_WALKTHROUGH.md), weaker-rank versus average-rank weighting and alternatives. | The heuristic needs real-world evaluation. “Adventurous” is a policy weight, not a calibrated novelty measure; AI assistance and rights review remain openly disclosed. |

## Why the live version depends on Qloo

Both participants' lists originate from Qloo in live mode. Their membership and ordering determine which works are compared and selected across the three domains. The application supplies the negotiation rule and activity structure; it does not create a competing cultural graph. Removing Qloo prevents live cultural retrieval. The fixture provider demonstrates the workflow only and cannot substantiate an improvement over an LLM-only approach.

## Release evidence still needed

Before submission, add real-key acceptance results, a verified externally accessible application URL and a public licensed source URL. Demonstrate that the live interface, documentation and submission claims agree. Keep participant-study or benchmark claims out of the final description unless they are actually measured. See [the release checklist](RELEASE_CHECKLIST.md) for external gates and the official deadline.
