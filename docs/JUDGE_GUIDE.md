# Judge quick-start

**Current package status:** local source and an offline demonstration are available. The Qloo-key application is pending organizer approval; authenticated integration, public hosting and public-source publication are not yet verified. This guide does not convert the local demo into an eligible published submission. The final hosted URL and repository URL must be added to [the submission draft](DEVPOST_SUBMISSION.md) after release.

## Five-minute local walkthrough

Use Node 22.19 or newer. Run `npm ci`, copy `.env.example` to `.env`, then run `npm run dev`. Open `http://localhost:5173`. No key is needed for the offline walkthrough.

1. Confirm the **Offline demo** banner. The initial profiles use Amélie and Bon Iver for person A, and Spirited Away and Nina Simone for person B. The fixture order is synthetic; it is not a Qloo response.
2. Leave **60 min** and **Find a balance** selected. Click **Build our session**. Check the music, film and book activities, their time total and the A/B rank labels.
3. Expand alternatives under a card. Compare the returned rank evidence; a missing rank means unknown fit. The rank policy is in [ARCHITECTURE.md](ARCHITECTURE.md), and numeric scores are in the JSON export.
4. Click **View agent steps**. Inspect the retrieve → negotiate → compose → verify stages. This is an executed workflow trace, not generated private reasoning.
5. On one card, choose **Not for us. Find another**. Confirm that work disappears from the revised picks and alternatives. The hard exclusion is sent into another graph invocation.
6. Use **Save session** or **JSON**. The export labels its source. JSON also includes the request and selected seeds; review it before sharing.

Optional: try 30 or 90 minutes, change a favorite, or select **Take a detour**. The latter lowers the weight on the weaker participant's rank; it does not guarantee a new choice or measure actual novelty. No media playback or content availability is supplied.

## What makes the workflow agentic

LangGraph orchestrates retrieval from a tool interface, candidate comparison, constraints, composition and verification. The structured interface supplies a goal and feedback. Rejection causes replanning. It is a deterministic graph with no LLM or free-form chat; see [the request walkthrough](REQUEST_WALKTHROUGH.md) for one concrete request/result pair.

## Live acceptance walkthrough — pending credential

After the entrant receives a key, they configure it directly in the server's ignored `.env` or deployment secret settings and restart. Never enter the key in the app or in chat. Switch to **Live Qloo**, search for each participant's favorites, and select the correct results using the title/category and any disambiguation text. Switching mode clears offline selections.

Generate and inspect a plan, then reject a pick. Confirm `qloo-live` in the JSON export and real upstream requests in permitted, redacted server-side evidence. The optional `npm run test:live` checks a local keyed server, requires unique exact title matches across three domains and stops instead of guessing when matches are ambiguous. A complete run uses at least 15 upstream attempts; it still does not measure cultural quality. The [API contract](API_CONTRACT.md) documents the integration and the [validation record](VALIDATION.md) distinguishes mocks from live tests.

## Errors and limits to inspect

Without a configured key, live mode is disabled. Failed live requests must display an error and never turn into fixture recommendations. A category with no eligible candidates is omitted with a warning and its time redistributed; complete exhaustion returns an error. Scores are local rank heuristics, not Qloo probabilities or evidence that a participant will enjoy a work. The three domains, finite returned lists and hard-exclusion feedback are the present product scope.
