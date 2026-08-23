# Netflix rule audit

## Scope

Netflix application, authentication and device bootstrap traffic, plus
Netflix-owned image, service-origin, and Open Connect video delivery namespaces.

## Primary sources

- [Netflix](https://www.netflix.com/)
- [Netflix network troubleshooting](https://help.netflix.com/en/node/13197)
- [Netflix Open Connect](https://openconnect.netflix.com/)
- Public WHOIS, DNS, and certificate checks for the dedicated `nflx*` namespaces

## Included rules

| Rule | Classification | Evidence | Reason |
| --- | --- | --- | --- |
| `DOMAIN-SUFFIX,netflix.com` | core | Netflix service and help docs | Application, authentication, secure, appboot, and uiboot hosts |
| `DOMAIN-SUFFIX,netflix.net` | core | WHOIS and DNS | Netflix-owned service namespace |
| `DOMAIN-SUFFIX,nflxext.com` | dedicated-infrastructure | WHOIS, DNS, and certificates | Netflix external assets |
| `DOMAIN-SUFFIX,nflximg.com` | dedicated-infrastructure | WHOIS, DNS, and certificates | Netflix image delivery |
| `DOMAIN-SUFFIX,nflximg.net` | dedicated-infrastructure | WHOIS, DNS, and certificates | Netflix image delivery |
| `DOMAIN-SUFFIX,nflxso.net` | dedicated-infrastructure | WHOIS, DNS, and certificates | Netflix service origins |
| `DOMAIN-SUFFIX,nflxvideo.net` | dedicated-infrastructure | Netflix Open Connect and DNS | Open Connect video delivery |

## Rejected candidates

| Candidate | Source discovered from | Decision | Reason |
| --- | --- | --- | --- |
| `fast.com` | Netflix network help | reject: feature-optional | Netflix-owned speed test, but not required for streaming |
| `netflixdnstest*.com` | Community comparison | reject: stale / unverified | Diagnostic candidates without a current stable requirement |
| `nflxsearch.net` | Community comparison and WHOIS | reject: unverified | Ownership alone did not establish a necessary client flow |
| `netflixinvestor.com`, `netflixtechblog.com`, `netflixstudios.com` | Netflix corporate properties | reject: out-of-scope | Not the consumer streaming service |
| AWS or Open Connect IP ranges and ASNs | Open Connect research | reject: asn-too-broad | Shared or dynamic infrastructure is not a stable Netflix-only boundary |

## Notes

Netflix's help material names exact `*.netflix.com` bootstrap hosts, all already
covered by the core suffix. Dedicated delivery suffixes were retained only
where registration, DNS, certificates, and service behavior consistently
identify Netflix infrastructure.
