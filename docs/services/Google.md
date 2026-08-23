# Google rule audit

## Scope

Google Search, Google account authentication, the public Google API namespace,
and Google static infrastructure. Product-specific rules for Gemini and YouTube
remain in their own service sets.

## Primary sources

- [Google Search](https://www.google.com/)
- [Google hostname allowlist](https://support.google.com/a/answer/6334001)

## Included rules

| Rule | Classification | Evidence | Reason |
| --- | --- | --- | --- |
| `DOMAIN,google.com` | core | Google Search | Search apex entry point |
| `DOMAIN,www.google.com` | core | Google Search | Primary Search host |
| `DOMAIN,accounts.google.com` | core | Google hostname allowlist | Account authentication |
| `DOMAIN-SUFFIX,googleapis.com` | official-dependency | Google hostname allowlist | Maintained Google API namespace |
| `DOMAIN-SUFFIX,gstatic.com` | dedicated-infrastructure | Google hostname allowlist | Maintained Google static namespace |

## Rejected candidates

| Candidate | Source discovered from | Decision | Reason |
| --- | --- | --- | --- |
| `DOMAIN-SUFFIX,google.com` | Community comparison | reject: too-broad | Would absorb much of the Google product ecosystem, including product-specific traffic |
| `DOMAIN-SUFFIX,googleusercontent.com` | Google hostname allowlist | reject: shared-infrastructure | Hosts content for many unrelated Google products and users |
| `DOMAIN-SUFFIX,1e100.net`, `gvt1.com`, `gvt2.com`, `gvt3.com`, `ggpht.com` | Google hostname allowlist | reject: shared-infrastructure | Broad delivery infrastructure is not specific to Search/API/static scope |
| `DOMAIN-KEYWORD,google` | Community comparison | reject: keyword-too-broad | Can match unrelated domains and third-party names |
| Google IP ranges or ASNs | Public Google network information | reject: asn-too-broad | Google's networks serve many products and third parties |

## Notes

The previous exact `www.googleapis.com`, `www.gstatic.com`, and
`ssl.gstatic.com` entries are represented by their official infrastructure
suffixes. This widens only the explicitly scoped API and static categories;
the whole `google.com` ecosystem remains intentionally excluded.
