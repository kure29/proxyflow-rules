# Rules automation

## Architecture

Rules Automation v3 separates discovery from acceptance:

```text
official source metadata ----+
                             +--> upstream audit --> review report
community candidate feeds ---+                          |
                                                        v
                                               manual evidence review
                                                        |
                                                        v
sources/services/*.json --> generator --> rules/*
```

`sources/services/*.json` remains the only canonical rule source. The audit
does not edit canonical services, generated rules, icons, releases, or any
consumer repository.

The machine fetches, normalizes, compares, fingerprints, reports, and opens a
Draft PR for changed audit state. A maintainer reviews evidence, accepts or
rejects candidates, edits canonical JSON when justified, regenerates outputs,
and decides whether to merge.

## Source classes

Official monitoring does not maintain a second URL list. The audit loads URLs
whose canonical source `kind` starts with `official-` directly from each
`sources/services/*.json` document. It checks reachability and content hashes.
A changed hash means only that manual evidence review is required.

`independent-network-verification` entries remain evidence metadata but are not
described or monitored as official sources.

Community discovery is configured in `sources/upstreams.json`. Version 1 uses
one representative, policy-free Surge typed list for each of the ten services
from blackmatrix7's `ios_rule_script` repository. It does not also fetch Loon,
Shadowrocket, Clash, Quantumult X, or `_Resolve` variants of the same semantic
set.

The supported community matcher whitelist is:

- `DOMAIN`
- `DOMAIN-SUFFIX`
- `DOMAIN-KEYWORD`
- `IP-CIDR`
- `IP-CIDR6`

Unsupported matcher types, invalid supported rules, and duplicates are counted
and reported rather than silently discarded.

## Candidate lifecycle

```text
discovered
  -> review
  -> independent evidence
  -> accepted or rejected
  -> canonical JSON, if accepted
  -> generated client outputs
```

An `acceptedOverlap` is an exact normalized rule already present in canonical
JSON. `communityOnly` is a discovery lead, not an accepted rule.
`canonicalOnly` is not a deletion request. Neither side of the comparison can
modify canonical coverage automatically.

## State schema

`automation/upstream-state.json` is deterministic and contains no observation
timestamps. Its shape is:

```json
{
  "schemaVersion": 1,
  "services": {
    "Service": {
      "community": {
        "sourceHash": "sha256:...",
        "candidateCount": 1,
        "candidateHashes": ["sha256:..."]
      },
      "official": {
        "canonical-source-id": "sha256:..."
      }
    }
  }
}
```

Community `sourceHash` covers semantic, non-comment rule lines independent of
line order. Candidate hashes cover normalized rule identities and are unique
and sorted. Official content fingerprints prefer HTTP `ETag` or `Last-Modified`
validators. Without a validator they use stable JSON key ordering, visible HTML
content without request-specific scripts or tag attributes, normalized plain
text, or raw bytes for other formats. The state does not store a community
response body, complete matcher list, official response body, URL, error
message, or `checkedAt` field.

## Fetch and failure behavior

The audit uses Node.js built-ins only. Requests require credential-free HTTPS,
follow at most five HTTPS redirects, identify this repository with a clear
User-Agent, time out after 15 seconds, and stop after 4 MiB of decoded response
content. Official responses without a strong ETag are fetched twice. If their
fingerprints disagree, the source is treated as unstable instead of changed.

Stable report statuses include `INITIALIZED`, `UNCHANGED`, `CHANGED`,
`UNAVAILABLE`, `FETCH_FAILED`, `HTTP_ERROR`, `OVERSIZE`, `PARSE_FAILED`, and
`UNSTABLE_CONTENT`. Failures are isolated per source. A failed community fetch
or parse retains its previous source hash, candidate count, and candidate
hashes. A failed or unstable official fetch retains its previous content hash.
A failure is never converted into a zero-candidate feed or interpreted as
removal of all rules.

Transient failures appear in console and Markdown summaries. Because failure
details and timestamps are deliberately not tracked, a failure by itself does
not create state churn.

## Local commands

Create the first tracked baseline only when no state file exists:

```sh
node scripts/audit-upstreams.mjs --initialize
```

Inspect current upstreams without writing tracked state:

```sh
node scripts/audit-upstreams.mjs --dry-run
node scripts/audit-upstreams.mjs --dry-run --details
```

Write to explicit state and Markdown summary paths:

```sh
node scripts/audit-upstreams.mjs \
  --output automation/upstream-state.json \
  --summary /tmp/rules-audit-summary.md
```

Run the offline synthetic test suite:

```sh
node --test tests/automation/*.test.mjs
```

Run the same complete validation entry point used by both workflows:

```sh
node scripts/validate-all.mjs
```

`--details` prints normalized comparison entries only to the terminal. It does
not add them to tracked state or the Draft PR summary.

## GitHub Actions

`.github/workflows/validate-rules.yml` runs for pull requests, pushes to `main`,
and manual dispatches. It checks generated-file freshness, validates all rule
formats, runs the offline automation tests, and checks whitespace errors. Both
workflows call `scripts/validate-all.mjs`, so the validation command set has one
maintained definition.

`.github/workflows/rules-audit.yml` runs every Monday at 03:17 UTC and by manual
dispatch. It performs the same validation before publishing audit state. When
state is unchanged it creates no commit, branch update, or PR. When state
changes it updates `automation/rule-audit` and creates or refreshes one Draft PR
against `main`.

Pushes and pull-request updates made with `GITHUB_TOKEN` normally do not start
another workflow run. After a successful audit branch push and Draft PR update,
the audit therefore dispatches `validate-rules.yml` explicitly with
`ref: automation/rule-audit`. `workflow_dispatch` is an allowed recursion
exception, and the resulting `Validate Rules` run is attached to that branch's
current HEAD for independent visibility on the audit PR.

The scheduled workflow enforces an output allowlist. Its commit may change only
`automation/upstream-state.json`; it cannot modify canonical JSON, generated
rules, or icons. The PR body includes per-service source, previous and current
candidate counts, added and removed hash counts, canonical overlap, unsupported
and invalid counts, and changed, unreachable, or unstable official source IDs.
It also states that no canonical rule has been accepted or removed
automatically.

The repository setting **Allow GitHub Actions to create and approve pull
requests** must be enabled for the built-in `GITHUB_TOKEN` to open the Draft PR.
The audit workflow grants the token `contents: write` for its state-only branch
push, `pull-requests: write` for Draft PR maintenance, and `actions: write` only
to dispatch branch validation. The validation workflow retains
`contents: read`. Neither workflow uses a PAT, GitHub App, additional secret, or
third-party action. The audit workflow does not approve, mark ready, merge, or
release anything.

## License and provenance boundary

blackmatrix7's `ios_rule_script` repository is GPL-2.0 and is used only as a
`community-candidate-index`. The audit downloads one feed per service into
ephemeral process memory, computes comparison data and opaque fingerprints, and
discards the body.

The MIT repository does not vendor those feeds, commit their raw bodies, store
their complete matcher lists, treat them as authoritative evidence, or copy
their rules into canonical JSON. Community overlap is not evidence by itself.
Every accepted ProxyFlow rule requires independent official evidence or a
bounded verification documented in its canonical service source.
