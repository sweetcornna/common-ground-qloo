# Privacy and security

This document describes the source implementation, not an already deployed service. A deployment operator must update it for their actual hosting, logging and retention settings before publication.

## Data flow

The interface asks for cultural seed selections, a session time budget, a ranking focus and rejected entity IDs. It does not require participant names, email addresses, an account, precise location or sensitive attributes. Use public cultural preferences you are comfortable submitting and obtain the other participant's consent.

In offline mode, the server searches and ranks local fixtures. In live mode, search text and entity-type filters go to Qloo; recommendations send selected entity IDs, the requested output category and excluded entity IDs. Exclusions filter out selected or rejected works so the next response can contain fresh candidates; they are not sent as learned dislike signals. The server receives the session request to compose and verify the plan. Sampling time and ranking focus are applied locally. The application does not infer sensitive traits or use recommendations for consequential decisions.

The source app has no database, user authentication, analytics integration or application-managed profile archive. Current interactive selections and results live in browser memory; server processing is transient. Explicit text or JSON exports create files on the user's device. JSON includes selected seeds and exclusions; treat exported preferences as personal to the participants and review before sharing. The in-process rate limiter keeps temporary client request counters. These statements do not guarantee that infrastructure or Qloo retain no data. Search uses query parameters, which may be recorded by a proxy or upstream service. Review both the actual hosting policy and applicable Qloo terms.

## Credential boundary

`QLOO_API_KEY` is read only by the Node server. Do not prefix it with `VITE_`, include it in a browser request or place it in public source, a recording or a model prompt. Configure it in an ignored local `.env` or the host's secret manager. Configuration responses reveal availability, not the value. The Qloo adapter allowlists HTTPS origins and rejects redirects. Client-facing failures use bounded messages rather than raw upstream response bodies.

The original package contains no issued Qloo credential and no authenticated Qloo output. Do not paste credentials into chat for validation; run the documented smoke procedure in a trusted environment with the secret supplied directly there. Rotate any credential accidentally disclosed through a public channel.

## Deployment responsibilities

Deploy behind HTTPS. Confirm proxy trust behavior for the specific hosting topology before relying on per-client rate limits. Keep quotas and upstream retries bounded; a public demo can otherwise consume the shared server account's quota. Set infrastructure retention deliberately, avoid logging preference bodies or authorization headers, and document who can access logs. Add monitoring without silently introducing third-party tracking.

The supplied app has no user-data deletion endpoint because it does not create persistent profile records. Infrastructure and upstream retention need their own operator processes. A production operator adding persistence or telemetry must revise this statement and provide appropriate controls.

Content names and API results are untrusted input; React renders them as text, and the API validates submitted structures. Recommendation ranks describe the output of a finite query. They should not be treated as personal facts, causal explanations or consent to access a copyrighted work. Review [the Qloo kit's safe-use guidance](https://github.com/qloo/qloo-hackathon-kit/blob/main/docs/SAFE_USE.md) alongside applicable service terms.
