# Common Ground

> **Current status: offline demonstration.** Demo results are curated fixtures, not Qloo output. The server-side Qloo integration is implemented but has **not been validated with a real API key**. Public application deployment and formal submission are pending; this project is not yet verified as submission-ready.

**Two tastes. One shared cultural experiment.** Common Ground turns two people's movie, music and book preferences into a short session of up to three activities they can explore together. A LangGraph workflow retrieves candidates, compares how each participant is represented, applies exclusions and rebuilds the plan after feedback. The interface is structured; the planner uses deterministic code and does not require an LLM.

This is a new Qloo Agentic Hackathon project built in October 2026. The source package includes an explicit offline demonstration and a server-side Qloo integration. **Live Qloo behavior has not yet been validated with a real key.** Offline recommendations are curated fixtures, never represented as Qloo output. Public application hosting and formal submission remain outstanding. Source repository: [sweetcornna/common-ground-qloo](https://github.com/sweetcornna/common-ground-qloo). See [validation](docs/VALIDATION.md) and the [release checklist](docs/RELEASE_CHECKLIST.md).

## Run locally

Requirements: Node.js 22.19 or newer and npm. From this directory:

```bash
npm ci
cp .env.example .env
npm run dev
```

Open `http://localhost:5173`. The development API runs on port `3001`; Vite proxies API requests. Leave `QLOO_API_KEY` blank to explore the clearly labelled offline mode. No model credentials are required.

For a production build served by the Node application:

```bash
npm run build
npm start
```

Open `http://localhost:3001`. Keep `dist/`, `build/`, `scripts/start.mjs`, `package.json`, the lockfile and installed production dependencies together. This command runs a local server; it does not publish the application.

## Enable Qloo

**Project access status, 8 October 2026:** the API-key application was successfully submitted in the parent task. Organizer approval is pending; no credential has been received or tested. Do not submit a duplicate application solely to run this package.

For a new entrant, open the [official competition resources page](https://qloo.devpost.com/resources) and follow its API-key application link. Complete the application yourself with your name, email, Devpost username, country and project summary, and review its event terms. The [developer guide linked by the rules](https://docs.qloo.com/reference/qloo-llm-hackathon-developer-guide#getting-your-api-key) is a secondary reference; its main host was inaccessible in the build environment.

Suggested project summary for the application:

> Common Ground helps two people turn movie, music and book preferences into a shared cultural sampling session. A LangGraph workflow is designed to retrieve Qloo recommendations for each profile, compare returned ranks, apply exclusions, allocate a time budget and replan after feedback. The source includes an explicitly labelled offline demonstration and a server-side Qloo adapter. We are requesting access to validate the real integration; no authenticated Qloo testing has been completed yet.

Set `QLOO_API_KEY` in your local `.env` using an editor, or use your hosting provider's secret manager when publishing is authorized. Do not paste credentials into chat, commit `.env`, or use a `VITE_` variable for this secret. Restart the server, select live mode, search for real seed entities and complete the live acceptance checks in [the checklist](docs/RELEASE_CHECKLIST.md).

| Variable | Purpose | Default |
| --- | --- | --- |
| `QLOO_API_KEY` | Server-only Qloo credential | Empty; live mode unavailable |
| `QLOO_BASE_URL` | Qloo API origin | `https://api.qloo.com` |
| `PORT` | Node server port | `3001` |
| `HOST` | Node listening address; use `0.0.0.0` in an authorized container/host | `127.0.0.1` |
| `QLOO_MAX_CALLS_PER_MINUTE` | Process-local upstream attempt budget; includes retries, not an official Qloo quota | `30` |
| `REQUEST_TIMEOUT_MS` | Total API work deadline in milliseconds | `45000` |

The adapter permits `https://api.qloo.com` and `https://hackathon.api.qloo.com`; use the latter only if the issuer instructs you to use it for your credential. Its event availability has not been verified. Requests send the key to the configured host. Live errors must be resolved or shown to the user; they never silently become demo results.

## Try the workflow

1. Choose a few movie, artist or book seeds for each participant.
2. Set a 30-, 60- or 90-minute sampling budget and balanced or adventurous focus.
3. Build the shared session. Inspect the available acts, participant rank evidence, alternatives and workflow trace.
4. Reject an unwanted suggestion and rebuild. The exclusion becomes a hard constraint for that next plan.

Sampling time is an application allocation, not the duration of a movie, album or book. Activities are suggestions to sample or discuss works through lawful access. No streaming, ticketing, prices, opening hours or availability are supplied.

## Development checks

```bash
npm run typecheck
npm test
npm run build
# Browser tests require the Playwright Chromium browser:
npx playwright install chromium
npm run test:ui
```

The lockfile pins the packaged dependency resolution. `npm install` is available for intentional dependency updates; prefer `npm ci` to reproduce this package. Review [VALIDATION.md](docs/VALIDATION.md) for actual outcomes rather than assuming the commands above were all run.

After configuring a real key on a locally running server, `npm run test:live` performs an opt-in transport smoke test. A complete run makes at least 15 upstream attempts: three searches plus a plan and replan, each with six insights calls. It requires a unique exact title match in each search and checks identities, exclusions, categories, provenance and time allocation. It does not measure recommendation quality. To use a different local port: `APP_URL=http://127.0.0.1:3002 npm run test:live`. The script accepts localhost origins only. See [the judge guide](docs/JUDGE_GUIDE.md) for a manual walkthrough.

## Project guide

- [Architecture and ranking semantics](docs/ARCHITECTURE.md)
- [Quality review closeout and remaining gates](docs/QUALITY_CLOSEOUT.md)
- [API contract and official technical evidence](docs/API_CONTRACT.md)
- [Request-to-result walkthrough](docs/REQUEST_WALKTHROUGH.md)
- [Privacy and security boundaries](docs/PRIVACY.md)
- [Security scope and reporting](SECURITY.md)
- [Judge quick-start](docs/JUDGE_GUIDE.md)
- [Judging criteria: evidence and gaps](docs/JUDGING_MAP.md)
- [English Devpost draft](docs/DEVPOST_SUBMISSION.md)
- [Optional demonstration script](docs/DEMO_SCRIPT.md)
- [Originality and AI assistance record](docs/AI_ASSISTANCE.md)
- [Rules review and official sources](docs/RULES_REVIEW.md)
- [Publication and submission checklist](docs/RELEASE_CHECKLIST.md)

Licensed under [MIT](LICENSE) for the project code. Qloo services, third-party packages and cultural works retain their own terms; see [third-party notices](THIRD_PARTY_NOTICES.md).
