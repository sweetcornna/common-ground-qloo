# Request-to-result walkthrough

This walkthrough uses an actual local offline run. It demonstrates plumbing and decision logic, **not Qloo output**. No personal data or credentials are present. See [demo request](examples/demo-request.json) and [demo response](examples/demo-response.json).

## Reproduce the offline run

After `npm ci`, `npm run build`, and `npm start`, run in a second terminal:

```sh
curl http://127.0.0.1:3001/api/plan \
  -H 'Content-Type: application/json' \
  --data-binary @docs/examples/demo-request.json
```

Person A selected the demo movie Amélie; person B selected the demo movie Spirited Away. These are user-selected cultural seed titles, not user identities. In demo mode their IDs are local fixture identifiers. They must never be reused as live Qloo IDs. The default UI uses additional music seeds, so its exact results differ from this minimal request.

1. **Retrieve:** obtain independently ordered artist, movie and book fixture lists for both seed profiles. Their deterministic ordering is synthetic.
2. **Negotiate:** merge each pair by ID, remove both seed IDs and any feedback exclusions, and compute balanced rank support. A rank `r` in a list of length `n` contributes `(n-r+1)/n`; a missing rank contributes zero to this conservative heuristic. The balanced score is `0.8 × minimum + 0.2 × mean`. This is application policy, not calibrated satisfaction.
3. **Compose:** choose the leading eligible item in each available category, retain alternatives and allocate the requested sampling time.
4. **Verify:** check distinct picks, exclusions and the exact total. The returned `source` is `curated-demo` and the warning explicitly identifies synthetic data.

To exercise feedback, put the first selected `entity.id` into `excludeIds` and repeat the request. The selected plan and its alternatives must no longer include that ID. The automated tests cover this invariant.

## What changes in real mode

The user explicitly selects live search matches after resolving ambiguity (year, author or other supplied disambiguation). The server receives their Qloo UUIDs. It sends an authenticated search request and, for each profile/domain, a request with the shape below:

```text
GET https://api.qloo.com/v2/insights
  ?filter.type=urn:entity:book
  &signal.interests.entities=<selected-Qloo-UUIDs>
  &filter.exclude.entities=<both-profiles-seeds-and-rejected-UUIDs>
  &take=20
X-Api-Key: [REDACTED — server only]
```

No tags, names of people, email addresses or inferred sensitive traits are sent. Excluded IDs are also sent so Qloo can replenish the next candidate window. Duplicate preferences are normalized before retrieval. The IDs may originate from movie, artist or book searches; the output filter controls the domain being explored. Entity names and IDs from returned Qloo lists replace fixture candidates. Ranking, time allocation and conversation prompts remain our own product logic. Live ranks describe the current exclusion-filtered candidate window, so ranks from different requests should not be directly compared. The response is labelled `qloo-live`; failures never trigger demo output.

**No authenticated request-to-result evidence exists yet.** Once credentials are safely configured, record a redacted live walkthrough and actual test outcomes. Do not relabel this offline example as a live run, publish a key, or imply that a rank establishes an individual's future behavior.
