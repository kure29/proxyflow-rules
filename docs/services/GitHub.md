# GitHub rule audit

## Scope

GitHub website, API, web editor, Pages, static assets, user content, and the
Container Registry. Large dynamic domain sets for Actions and Codespaces are
not folded into this compact general GitHub service set.

## Primary sources

- [GitHub restricted-network guidance](https://docs.github.com/en/get-started/using-github/allowing-access-to-githubs-services-from-a-restricted-network)
- [GitHub Meta API](https://api.github.com/meta)
- [GitHub IP address guidance](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/about-githubs-ip-addresses)

## Included rules

| Rule | Classification | Evidence | Reason |
| --- | --- | --- | --- |
| `DOMAIN-SUFFIX,github.com` | core | GitHub Meta API | Website, API, codeload, and Git operations |
| `DOMAIN-SUFFIX,github.dev` | core | GitHub Meta API website domains | GitHub web editor |
| `DOMAIN-SUFFIX,github.io` | core | GitHub Meta API website domains | GitHub Pages |
| `DOMAIN-SUFFIX,githubassets.com` | dedicated-infrastructure | GitHub Meta API website domains | GitHub static assets |
| `DOMAIN-SUFFIX,githubusercontent.com` | dedicated-infrastructure | GitHub Meta API website domains | GitHub raw, object, action, and user content |
| `DOMAIN-SUFFIX,ghcr.io` | dedicated-infrastructure | GitHub Meta API package domains | GitHub Container Registry |

## Rejected candidates

| Candidate | Source discovered from | Decision | Reason |
| --- | --- | --- | --- |
| `DOMAIN-SUFFIX,githubapp.com` | GitHub Meta API | reject: too-broad | GitHub Apps are user- and vendor-defined; not all traffic is core GitHub use |
| `DOMAIN-SUFFIX,core.windows.net`, `windows.net`, `azureedge.net`, `microsoft.com` | GitHub Meta API | reject: shared-infrastructure | Codespaces and Actions use shared Microsoft infrastructure |
| Dynamic `productionresultssa*.blob.core.windows.net` hosts | GitHub Meta API | reject: stale / shared-infrastructure | Entries change and are feature-specific |
| GitHub Actions runner IP ranges | GitHub IP docs and Meta API | reject: shared-infrastructure | Hosted runners use dynamically assigned shared infrastructure |
| General GitHub IP ranges | GitHub IP docs | reject: stale / too-broad | GitHub recommends monitoring and says the list is not exhaustive |
| `DOMAIN-KEYWORD,github` | Community comparison | reject: keyword-too-broad | Can match unrelated domains |

## Notes

The selected suffixes match the Meta API's stable website categories and the
registry namespace. Actions, Codespaces, Packages, and Copilot can require
additional dynamic or shared endpoints; they are documented as rejected here
rather than silently expanding the general GitHub boundary.
