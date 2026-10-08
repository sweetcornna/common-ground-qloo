# Security

Common Ground is a new application under local review. Passing automated tests or a dependency advisory scan does not establish that it is free of vulnerabilities. The current executed checks and unresolved release gates are recorded in [VALIDATION.md](docs/VALIDATION.md).

## Scope and current boundaries

The Express server handles user-supplied searches, seed selections and plan requests. Live mode accesses a paid or quota-limited upstream account through one server-side Qloo key. There are no user accounts, database writes, model prompts, uploads or arbitrary external URL fetches. An unauthenticated public deployment would still expose that account's API quota through the permitted application endpoints.

Implemented controls include schema validation, bounded input sizes, JSON body limits, security headers, API request rate limiting, fixed upstream paths, an allowlist of Qloo HTTPS origins, rejected redirects, bounded upstream attempts and safe client-facing errors. A shared provider adds a process-local attempt budget, a two-call concurrency limit, bounded queue and upstream cooldown. Request cancellation and a total work deadline limit abandoned work. The React client renders entity text without injecting upstream HTML. These controls are defense layers, not a claim that the final public environment has been penetration-tested.

The service keeps its key out of browser code and returns only configuration availability. `.env` must remain untracked and outside source archives. Use host secret settings for a deployment. A browser showing that live mode is available means a plausible server configuration exists, not that Qloo has authenticated it.

## Before running a public instance

Use HTTPS and a supported Node runtime (at least 22.19). Confirm the actual reverse-proxy topology, client addressing and quota budget; per-process counters are not a shared limit across replicas. Do not set Express proxy trust indiscriminately or treat a client-supplied forwarding header as an authenticated identity. Keep the app's request limits and upstream quota controls aligned with the issued account.

Infrastructure can log search URLs and network metadata even though the app does not store profiles. Exclude secret headers and preference request bodies from logs. A downloaded JSON session contains seeds and rejected IDs; review it before sharing. See [PRIVACY.md](docs/PRIVACY.md) for data flow.

The operator is responsible for timely dependency updates and retesting. Run `npm audit` and review its output at release time; its result changes as advisories are published. A lockfile supports reproducibility but is not a security guarantee. Container and remote CI validation must be tracked separately from local build success.

## Reporting a suspected vulnerability

No public repository or dedicated security contact has been published yet. Send the maintainer a private report through the channel by which you received this package. Include the affected revision, a minimal reproduction, expected versus actual behavior and the impact. Do not include a real key, another person's preferences or unrestricted upstream payloads. Once a public repository is created, the owner should enable a private vulnerability-reporting route and replace this paragraph with that verified contact.

If a key is disclosed, revoke or rotate it with Qloo, remove it from the affected configuration and investigate retained copies. Do not put the disclosed key into an issue or another chat message to demonstrate the problem.

Upstream successful response bodies are streamed with a 2 MiB cap. Error response bodies are cancelled before the shared request slot is released; aborts also cancel stalled streams. These guards avoid leaving connections and memory unbounded on malformed upstream responses.
