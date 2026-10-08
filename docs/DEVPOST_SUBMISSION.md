# Devpost submission draft

Status: reviewable English draft, not submitted. The API-key application has been submitted and is awaiting organizer approval. Fill the links only after authorized publication. Confirm the live behavior and update this draft with verified results before using it as the final entry.

**Project name:** Common Ground

**Tagline:** Two tastes. One shared cultural experiment.

**Live application:** Pending authorized deployment and real-Qloo validation.

**Public source repository:** Pending authorized publication.

**Built with:** Qloo API, LangGraph, TypeScript, React, Express, Vite, Zod, Vitest and Playwright.

**Testing instructions:** [Judge quick-start](JUDGE_GUIDE.md); publish this with the repository and final application URL. Judges should use the public application after its real-Qloo acceptance checks pass.

**License:** MIT for the original project code; see `THIRD_PARTY_NOTICES.md` for dependency and data boundaries.

**Demo video:** Optional; [recording script](DEMO_SCRIPT.md) supplied. No uploaded recording is claimed.

## Inspiration

Choosing something together is often a negotiation where the most vocal person's taste wins. A friend's favorite movie, an artist you love and a book neither of you has explored can reveal a better starting point. We wanted a small cultural experiment that gives both people a visible place in the decision.

## What it does

Two people enter movie, music-artist and book preferences. Common Ground plans a 30-, 60- or 90-minute session across up to three sampling acts. Each suggestion shows its position in the participants' recommendation lists and alternatives. The documented application score is included in the JSON export. Balanced and adventurous policies offer different ways to negotiate the overlap. Rejecting a suggestion adds an exclusion and reruns the planning workflow.

The result is an invitation to listen, watch a lawful preview, browse or discuss a work together. The time budget is for sampling, not a claim that a film or book can be completed in those minutes.

## How we built it

A structured React interface communicates with a TypeScript server. In live mode, the server resolves seed entities and requests Qloo recommendations separately for the two taste profiles across movies, artists and books. A LangGraph workflow coordinates retrieval, comparison, constraints and composition. The browser never receives the API key. The planner's decision policy is inspectable code; no LLM is used at runtime.

Qloo supplies the cultural recommendation ordering in live mode. Common Ground supplies the negotiation policy, session allocation and activity prompts. Our rank-based comparison is not a Qloo probability or an explanation of its internal model. A missing appearance in a returned list is incomplete evidence, not proof of dislike.

## Why Qloo matters

The shared plan depends on recommendations that connect the participants' seeds across cultural domains. Removing Qloo from live mode removes that cultural retrieval step. The offline mode exists only to make the workflow testable without credentials; its authored fixture relationships cannot establish Qloo quality or replace a validated live integration.

## Challenges

We needed to represent two different tastes without turning an application score into false certainty. We also needed feedback to change the next plan, rather than simply regenerate prose. We separated retrieval evidence from ranking policy, made exclusions explicit, and exposed the workflow trace. Missing credentials, empty results and upstream errors are surfaced rather than disguised as recommendations.

## What we learned

A useful cultural agent needs a decision the user can inspect. A short shared session makes trade-offs concrete: whose preferences are represented, which options were considered and what changed after a rejection. Explicit sampling activities also avoid implying playback rights or inventing real-world availability.

## Current validation and limitations

See `docs/VALIDATION.md` for executed checks. At source-package handoff, authenticated Qloo acceptance testing, external hosting and public-source publication remain outstanding. We have not measured recommendation satisfaction against a baseline and do not claim a demonstrated quality improvement. Live endpoint compatibility, account permissions and quotas must be confirmed with the entrant's credentials.

## Next steps

Complete real-Qloo acceptance testing, gather feedback from pairs using the app, and study whether the visible fairness policy helps both people feel represented. Future work could add user-controlled persistence and compare alternative rank aggregation policies using consented evaluation data.

## AI assistance

AI assistants contributed substantially to the product design, code, tests and documentation. The entrant selected Qloo, approved the cultural exploration direction and delegated detailed implementation decisions. See `docs/AI_ASSISTANCE.md` for the contribution and decision record. Final review and submission representations remain with the entrant.
