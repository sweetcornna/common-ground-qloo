# Independent UX retest

Date: 2026-10-08. System Chromium 151; local app only; no Qloo credential. Reviewer changed tests and review documentation, not application implementation.

**Result: no open high or medium issue remains from the initial UX review within the tested scope.**

| Initial item | Retest outcome | Evidence |
| --- | --- | --- |
| M1 contrast and mobile readability | Closed | Normal supporting text increased to at least 12 px; axe selected WCAG 2/2.1 A/AA checks reported zero violations on the initial interface, expanded results and 320 px results. Updated mobile screenshot visually inspected. |
| M2 pending plan locks recovery | Closed | Cancel restores controls; a deliberately abort-resistant old fetch cannot overwrite a later 30-minute plan. Simulated clock passes 50-second deadline; actionable timeout appears and Build/Start fresh become enabled. |
| M3 identity disambiguation lost | Closed | Test-only supplied author/year appears in main recommendation and alternative; text export includes the selected work's author/year. Source also preserves supplied disambiguation in selected seed chips. |
| M4 no completion focus | Closed | Keyboard Enter on Build results in `#results-title` receiving focus. Persistent status region provides cancellation feedback. |
| L1 320 px decorative overflow | Closed | At 320 px, document scroll width is no greater than viewport width. |
| L2 demo-script rank/score wording | Handed to parent documentation owner | Reword on-screen narration to returned rank positions, distinguishing local scores in JSON. This low-priority wording issue does not block the tested UI. |

## Additional evidence

`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:ui`: **10 / 10 passed**, including configuration 503 recovery, exhaustion/422 recovery preserving the previous plan, empty search, stale-search suppression, final screenshots, export, mode isolation and mobile layout. The initial manual exhaustion test exercised 31 successive successful real offline skips before the final 422; the regression test uses a labelled intercepted 422 for faster deterministic recovery coverage.

`npm run typecheck` and `npm test`: **passed**, with **39 / 39 unit/API/provider/reliability/smoke tests** at this review checkpoint. Parent owns final production/archive reruns after any remaining changes.

The Playwright server now refuses an occupied 5173 instead of reusing an unknown running service. Test environment explicitly clears the Qloo key. A running review server caused the expected occupied-port failure; the reviewer stopped that server and reran successfully. No live endpoint calls were used.

## Remaining boundaries

Automated axe scans and native keyboard checks do not substitute for broad assistive-technology testing. No real Qloo recommendation quality, satisfaction improvement, production latency, external-host availability or final eligibility was established. Public release, authentic live acceptance and formal submission remain separate user/organizer gates. Those unresolved release prerequisites must remain visible in the handoff materials.
