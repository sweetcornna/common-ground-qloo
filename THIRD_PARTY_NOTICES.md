# Third-party notices

The MIT license covers Common Ground project code and documentation. It does not relicense Qloo's service, data or trademarks, nor the cultural works named in the application.

Runtime and development packages are declared in `package.json` and resolved in `package-lock.json`. The [dependency inventory](docs/DEPENDENCIES.md) records the actual locked versions and declared licenses, including transitive and optional packages. [Collected license and NOTICE texts](docs/THIRD_PARTY_LICENSE_TEXTS.txt) preserve files from dependencies installed in this build environment. Optional packages for other platforms are listed in the inventory but their files were not installed here. Repeat the collection after changing dependencies or building for another platform.

Major runtime components include LangGraph, React, React DOM, Express, express-rate-limit, Helmet and Zod (MIT), and dotenv (BSD-2-Clause). TypeScript and Playwright use Apache-2.0; Vite, Vitest and esbuild use MIT. Their own license and notice files remain authoritative. Preserve applicable notices when redistributing dependencies or bundled code. An inventory is not a legal rights clearance or a guarantee that every required attribution is captured by a package's metadata.

Qloo is a third-party API. The entrant and operator must have permission to use it under the applicable account, API and event terms. No Qloo key or authenticated Qloo response is included in this source package. Offline fixtures are authored demonstration data; cultural entity names identify works or artists and do not imply endorsement. The package does not include full movies, recordings, book text, cover art or licensed playback access.

Before a public release, the entrant should verify ownership and authority to apply the project license, confirm required package notices, review the service terms, and replace the generic contributor attribution if appropriate. AI assistance and the user's actual decision history are disclosed in `docs/AI_ASSISTANCE.md`; no assertion of entrant eligibility or exclusive human authorship is made.
