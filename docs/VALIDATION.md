# Validation record

Independent local QA performed on **2026-10-08** using Node **24.19.0**, Vitest **5.0.3**, Playwright, and system Chromium **151.0.7922.173** on Debian Linux. No actual Qloo key was supplied or read. All provider transport tests use test-only dummy strings and mocked HTTP responses.

| Check | Result | Evidence |
| --- | --- | --- |
| TypeScript strict checks | Passed | `npm run typecheck` |
| Planner, provider and Express API tests | Passed, 39 tests | `npm test`, planner/API/provider/reliability/smoke tests |
| Production client/server build | Passed | `npm run build` (TypeScript + Vite + esbuild) |
| Desktop and mobile browser flows | Passed, 10 tests | `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:ui` |
| Visual inspection | Passed | `screenshots/desktop-session.png`, `screenshots/mobile-session.png`; inspected rendered layout |
| Local production serving | Passed | Final clean build started on a local test port: HTTP 200, security headers, bundled client, three demo cards, no page errors, no-store API; no key |
| Clean source-archive install | Passed | Final source archive extracted into a separate directory; `npm ci`, `npm run check` (39 tests/types/build), and `npm run test:ui` (10 tests, system Chromium) all passed |
| Dependency advisory scan | Passed at handoff | `npm audit` reported 0 known vulnerabilities |
| Real Qloo API calls | **Not run** | No credentials supplied; mock tests do not demonstrate API entitlement or actual ranking quality |
| Public deployment and remote browser access | **Not run** | Requires separate authorization and hosting configuration |
| Public repository and remote CI | **Publication follow-up** | Public source destination: [sweetcornna/common-ground-qloo](https://github.com/sweetcornna/common-ground-qloo). Remote CI results must be checked separately; local test results below do not establish remote CI success. |
| Docker image build/run | **Not run in independent QA** | Dockerfile supplied; validate on a Docker-capable host |
| Hackathon submission / eligibility approval | **Not performed** | User action and organizer requirements still apply |

## Quality iteration and accessibility checks

A second independent review found four medium issues in contrast/readability, cancellation, recommendation disambiguation and completion focus. All four were fixed and independently retested; see [initial findings](reviews/ux-initial.md) and [retest](reviews/ux-retest.md). The current ten-test browser suite covers config failure/retry, a 50-second simulated timeout, cancellation and a deliberately abort-resistant stale response, empty search and late-response suppression, exhaustion recovery, supplied disambiguation in text export, and result-heading focus after keyboard activation. Automated axe scans of the starting interface, expanded results, and 320 px mobile results found **zero violations** for the selected WCAG 2/2.1 A/AA rules. This is not a complete accessibility or screen-reader certification.

The final quality-iteration source archive was extracted into a fresh directory and verified on 2026-10-08. No pre-existing node_modules or build output was reused; npm installed from the lockfile. The complete 39-test engineering suite and 10-test browser suite passed there.

## Behavior covered

- Exact 30/60/90-minute totals; distinct recommendations; seed and rejection exclusions.
- Changed profiles produce changed fixture rankings; skipped picks disappear from picks and alternatives.
- Balanced scoring favors shared support; adventurous scoring can surface a one-sided discovery.
- Missing rank is described as unknown fit, one-sided fallback has a warning, missing categories redistribute time, complete exhaustion returns an actionable error.
- Explicit demo provenance in API, interface, and exported JSON; ordered retrieve/negotiate/compose/verify graph trace.
- Absent credentials fail closed for both live search and live plans without returning demo data.
- Invalid durations, empty profiles, unexpected fields, invalid live IDs and malformed JSON are rejected.
- Request body limit returns 413; the 46th API request within one minute returns 429.
- Public configuration never includes a key. Upstream failure bodies and exception details are not reflected.
- Qloo request host/path/parameters/header and no-key-in-URL assertions; redirect refusal; retries limited to two attempts; authentication, rate-limit, network, malformed JSON and malformed payload handling.
- Documented generic `urn:entity` plus subtype parsing, disambiguation preservation, lowercase ID normalization, duplicate filtering, unsuccessful response rejection, search 404 empty results versus insights 404 failure.
- Browser: search/add a favorite, change session length, generate, reject/replan, view trace and alternatives, download and inspect JSON provenance, reset including open search state.
- Browser: missing-key live button disabled. A clearly mocked config enables the mode-switch test, verifying demo seed clearing and an actionable live-search error against the real local no-key server. **This is not a successful live integration test.**
- Mobile at 375 × 812: three result cards rendered and document width does not exceed viewport width. Desktop page emitted no uncaught JavaScript errors during the tested flow.

## Reproduction

```sh
npm ci
npm run check
npx playwright install chromium
npm run test:ui
```

If an already installed Chromium is preferred:

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:ui
```

The Playwright harness starts the local app and explicitly clears `QLOO_API_KEY`. It refuses to reuse an existing development server, so an unrelated or credential-configured process on port 5173 causes an explicit failure instead of accidental live calls. Stop only your own conflicting process before testing. Provider tests instantiate isolated apps with explicit environments; they never load user secrets.

In this environment the browser download failed with HTTP 403 from the browser CDN. Existing system Chromium was used successfully instead. An early concurrent CSS edit briefly produced a Vite import error; the frontend corrected the import and the complete browser suite subsequently passed cleanly. Neither resolved issue is an outstanding application failure.

## Remaining release gates

The user must obtain a key through the official Qloo workflow and configure it in an ignored local `.env` or hosting secret settings, never in chat or browser code. Run the opt-in live smoke command described in the README, inspect real search/disambiguation and all three recommendation categories, and confirm errors under the actual API account. Review real cultural quality and latency; fixture tests cannot establish them. After explicit release authorization, verify the public build, secret protection, quota handling and remote judge access before submitting. No claim of complete eligibility or likely award is made.
