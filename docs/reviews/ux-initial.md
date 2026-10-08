# Independent UX and submission-material review — initial

Date: 2026-10-08. Reviewed the local source application in system Chromium 151 at 320, 375 and 768 px widths, with actual offline API calls plus explicitly intercepted responses for failure/concurrency/identity scenarios. No Qloo credential was read or used. This is independent review evidence, not live Qloo validation. No implementation files were changed for this initial review.

## Findings

### M1 — Essential guidance has insufficient contrast and very small mobile text

**Severity: Medium. Design impact:** users with reduced vision can miss provenance, sampling limitations and rank evidence, although these disclosures are central to understanding the recommendations.

At a 375 px viewport, computed colors/backgrounds gave these contrast ratios for normal text: `.config-note` 3.70:1 at 9 px; `.profile-note` 2.81:1 at 10 px; `.seed-count` 3.43:1 at 10 px; `.support-label` 3.87:1 at 10 px; `.small-note` 3.06:1 at 10 px; `.session-footnote` 3.47:1 at 9 px; `.card-category` 4.20:1 at 11 px; `.mode-description` 4.16:1 at 10 px. These are below the 4.5:1 normal-text accessibility benchmark. Measurements use actual computed foreground and nearest nontransparent background, not screenshot estimation.

**Reproduce:** generate a default offline plan at 375 × 812, inspect computed styles of the selectors above. **Fix acceptance:** improve the shared readable text palette and mobile sizes; check essential text across both modes and results for at least 4.5:1 contrast.

### M2 — A pending plan can lock all recovery controls indefinitely

**Severity: Medium. Design/reliability impact:** the core workflow cannot be cancelled or restarted from the interface when a local/proxy request stalls. This is particularly relevant to live mode, whose bounded upstream calls can still take tens of seconds.

Intercepting `/api/plan` without fulfilling it kept `Start fresh`, mode controls, inputs and the build action disabled, with no cancel button. `generate()` in `src/App.tsx` does not supply a timeout or abort signal. The browser remained loading until the test explicitly completed the response. A later 503 did restore controls and preserve selections, so ordinary completed failures recover correctly.

**Fix acceptance:** provide a bounded request deadline and an accessible cancel action; preserve input and any prior successful plan; ignore a cancelled/superseded response even if it completes late. Explain cancellation/timeout with a retry path.

### M3 — Recommended identity disambiguation is dropped in cards and plain-text export

**Severity: Medium. Potential-impact impact:** users cannot reliably identify which same-title cultural work to explore after receiving the recommendation.

An intercepted offline plan response supplied book `Dune` with `disambiguation: "Frank Herbert · 1965"`, and an alternative also called `Dune` with `disambiguation: "Different author · 2001"`. Both cards rendered only `Dune`; no author/year text existed in the DOM. `Save session` also omitted the supplied disambiguation. The upstream adapter/shared entity contract supports this data and search displays it, so losing it later weakens the actual discovery task. JSON retains the object, but users should not need to inspect JSON to identify a work.

**Fix acceptance:** retain available disambiguation in selected seeds, main recommendations, alternatives and the human-readable export. Never fabricate it where Qloo has not supplied it.

### M4 — Plan completion changes the page without a focused/announced result

**Severity: Medium. Accessibility/design impact:** screen-reader and keyboard users receive no clear completion summary after the transient loading status disappears.

After keyboard Enter on Build and after keyboard Enter on a skip button, `document.activeElement` was `BODY`; the page scrolled to results, while no `[aria-live]` or `role="status"` region remained. The next Tab did reach Save session, so this is **not** a keyboard trap. However the result heading is not focused and there is no persistent completion announcement; visual scrolling alone does not communicate the new outcome nonvisually.

**Fix acceptance:** focus an appropriate result heading/region after successful generation/replan or provide a persistent, useful completion announcement with a deliberate focus strategy. On cancellation/errors ensure focus stays on a usable recovery control.

### L1 — Decorative hero slightly overflows a 320 px viewport

**Severity: Low.** Measured `documentElement.scrollWidth=322` against `clientWidth=320`. Rotated `.circle-a` reached x=-3.23 and `.circle-b` x=321.53. At 375 and 768 px there was no overflow. Clip or scale the decorative art without clipping keyboard outlines on interactive content.

### L2 — Demo narration mentions scores where the card shows only ranks

**Severity: Low. Material consistency.** The 1:15–1:50 row in `docs/DEMO_SCRIPT.md` says “These are application rank scores” while the on-screen card shows A/B rank positions. The draft correctly says the application score is in JSON. Adjust the spoken line to distinguish returned rank positions from locally computed scores, or show JSON during that line. This is a presentation correction, not a false live-data claim.

## Verified strengths and non-findings

- Actual default demo supports 31 successive successful skips, then returns explicit `NO_CANDIDATES` (422) on the next skip. The previous successful plan remains visible and `Reconsider skipped picks` restores three acts. No silent substitution or false Qloo provenance was seen.
- A failed request restores the Build action and keeps selections. A server-config error exposes Retry connection. The development StrictMode double effect can briefly produce both an error and a successful configuration when only one of two intercepted requests fails; this was not classified as a production failure.
- A delayed old search response did not replace a newer search result: after “slow” then “fast”, there were zero stale-match buttons and one current-match button. Existing AbortController cancellation worked in this browser test.
- Human-readable export contains `curated-demo`, synthetic-data warnings, methods, activity budgets and conversation prompts. JSON export provenance was already verified in the baseline suite.
- Search inputs have labels, buttons use native semantics, focus outlines exist, and alternatives use keyboard-operable native details/summary. No keyboard trap was found.
- Materials consistently disclose substantial AI assistance, deterministic LangGraph workflow, no LLM dependency, no authenticated Qloo validation, no measured quality uplift and no public release. Sampling time is not claimed as actual work duration or availability.
- Against Design, the visual hierarchy and mode distinction are strong. Against Potential Impact, two-person negotiation is a coherent use case; real quality and mutual-satisfaction benefit remain hypotheses pending consented user evaluation. Do not manufacture a benchmark or imply demonstrated interpersonal fairness.

## Scope and retest requirements

No high-severity issue was found in this UX/material pass. M1–M4 are locally fixable and should be rechecked independently. Real-Qloo identity quality, latency, cultural suitability, external hosting, remote access and formal submission remain outside tested scope. These are release gates, not claims of passing eligibility.
