# Independent product, Qloo contract and rules review

Reviewed 8 October 2026, before the quality iteration. Scope: read-only implementation review; this report is the only file edited by this reviewer. No authenticated Qloo request was made.

## Evidence and applicable criteria

The [official rules](https://qloo.devpost.com/rules) describe four equally weighted criteria: technological implementation, design, potential impact and quality of the idea. The [overview](https://qloo.devpost.com/) and [resources](https://qloo.devpost.com/resources) were read alongside the local official Qloo documentation mirror and hackathon kit. The public working application, open-source repository, English materials and sustained judge access remain release gates, not evidence already established by this local project. AI assistance is appropriately disclosed without claiming an eligibility decision.

Contract sources: [search](https://github.com/qloo/docs-public/blob/main/reference/get-search.md), [insights example](https://github.com/qloo/docs-public/blob/main/reference/basic-insights-use-case.md), [parameters](https://github.com/qloo/docs-public/blob/main/reference/parameters.md), [safe use](https://github.com/qloo/qloo-hackathon-kit/blob/main/docs/SAFE_USE.md), and [API access](https://github.com/qloo/qloo-hackathon-kit/blob/main/docs/API_ACCESS.md). Search `types`, insights `filter.type` and `signal.interests.entities`, server-only API header, and `results.entities`/generic entity plus subtype handling agree with these references. That establishes documentary alignment only; host access and actual responses need the issued credential.

## Medium-priority findings

### P1 — Feedback does not replenish the retrieval window

Evidence: `server/agent.ts:34` calls `recommend(p.seeds, type)` on every run. Exclusions first appear at line 39, after retrieval. `server/provider.ts:80` always requests the same first 20 results for unchanged seeds. Repeated skips therefore issue six identical upstream reads while progressively removing the same window. A category eventually disappears (or all candidates are reported exhausted), even when Qloo may have further eligible results. This weakens the core feedback loop and spends limited event quota without obtaining fresh evidence.

Fix: pass canonical seed and rejected IDs to the documented `filter.exclude.entities` parameter, retaining local defensive exclusion validation. Clearly describe ranks as positions in each current filtered response, not stable global ranks. An alternative is an explicit bounded continuation strategy with accurate window-exhaustion messaging. Add a transport assertion for exclusions and a planner test where skipping the first window obtains a new candidate. Do not infer dislike or train a preference model from a skip.

### P2 — Duplicate preference inputs change the request semantics

Evidence: `server/app.ts:11–14` bounds and validates IDs but does not reject or canonicalize duplicates within a profile. `server/provider.ts:80` joins every input ID; the demo provider also hashes the duplicate-bearing array. The UI prevents ordinary duplicate selection, but the public endpoint accepts a repeated seed as two interests. The same intended preference set can therefore produce a different fixture plan and an ambiguous duplicated live signal.

Fix: deduplicate by normalized entity ID within each profile (or clearly reject duplicates), preserve legitimate overlap between the two people, and deduplicate excluded IDs. Reject conflicting type declarations for one ID. Cover repeated and mixed-case inputs with API tests and ensure canonical provider inputs.

### P3 — Live search can offer entities the plan endpoint cannot accept

Evidence: `parseEntities` at `server/provider.ts:40–44` accepts any nonempty ID/name, arbitrary disambiguation length and even a missing declared category. The public live-plan schema requires UUID IDs and bounds metadata. Consequently an unexpected/malformed upstream entity can be displayed and selected, only for the next planning request to fail validation. Existing transport tests use IDs such as `found` and `ABC`, so they do not expose this mismatch.

Fix: validate live entities against the same ID/metadata contract used by plan input; bound or safely omit optional display metadata, and reject malformed nonempty result sets rather than representing them as a legitimate empty recommendation. Use realistic UUID contract fixtures and add malformed-result cases. Demo IDs must remain confined to the explicit demo provider.

## Positive findings and proportionate scope

The two independent profile queries across three output domains give Qloo a substantive role. Local rank aggregation exposes both people's evidence, missing results are explicitly unknown rather than dislike, and the application does not call rank scores individual liking probabilities. Candidate alternatives, exact sampling budgets, defensive verification and explicit skip feedback constitute useful inspectable orchestration. A deterministic LangGraph workflow satisfies the documented framework route; adding an LLM solely for appearance would introduce cost and unverifiable explanations without fixing these findings.

The fairness score is a heuristic, not a demonstrated fairness guarantee. Current documentation says no satisfaction improvement has been measured. Keep that limitation and add rubric-to-evidence mapping and an explicit judge walkthrough. No prices, licensing availability, full-work runtimes or causal cultural explanations were invented in the inspected output.

## External gates

Real Qloo smoke/acceptance testing, actual recommendation quality assessment, public deployment, public repository and formal submission remain unperformed. No fixture test may close those gates. Updated documentation should distinguish the parent's authorized key-application process from this environment's lack of credentials, and should not imply that a submitted application means an issued key.
