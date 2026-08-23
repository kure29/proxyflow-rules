# Claude rule audit

## Scope

Claude web, Anthropic API, Console, Claude Code documentation and downloads,
and Claude-hosted user content. Optional shared hosts used by individual Claude
Code features are not treated as Claude-wide traffic.

## Primary sources

- [Anthropic corporate proxy configuration](https://code.claude.com/docs/en/corporate-proxy)
- [Claude Code on the web](https://code.claude.com/docs/en/claude-code-on-the-web)

## Included rules

| Rule | Classification | Evidence | Reason |
| --- | --- | --- | --- |
| `DOMAIN-SUFFIX,anthropic.com` | core | Anthropic corporate proxy docs | API and Anthropic service hosts |
| `DOMAIN-SUFFIX,claude.ai` | core | Anthropic corporate proxy docs | Claude app and downloads |
| `DOMAIN-SUFFIX,claude.com` | core | Claude Code web docs | Console, code, platform, and documentation |
| `DOMAIN-SUFFIX,claudeusercontent.com` | core | Anthropic corporate proxy docs | Claude content and browser bridge |

## Rejected candidates

| Candidate | Source discovered from | Decision | Reason |
| --- | --- | --- | --- |
| `storage.googleapis.com` | Anthropic corporate proxy docs | reject: stale / shared-infrastructure | Anthropic marks it as an older installer dependency; it is not Claude-specific |
| `raw.githubusercontent.com` | Anthropic corporate proxy docs | reject: shared-infrastructure | Optional release-note and plugin-marketplace access would capture unrelated GitHub traffic |
| `bridge.claudeusercontent.com` | Anthropic corporate proxy docs | reject: duplicate | Already covered by the verified first-party suffix |
| `api.anthropic.com`, `platform.claude.com`, `downloads.claude.ai` | Anthropic official docs | reject: duplicate | Already covered by their first-party suffixes |
| `DOMAIN-KEYWORD,claude` | Community comparison | reject: keyword-too-broad | Can match unrelated domains |

## Notes

The four suffixes are deliberately compact, but they cover every first-party
hostname Anthropic lists for its web, API, Console, download, and browser-bridge
flows. Shared optional dependencies remain outside this service set.
