# Steam rule audit

## Scope

Steam Store, Community, game and chat services, user and game content,
Steam-owned static/server namespaces, and narrowly scoped Steam Akamai hosts.

## Primary sources

- [Steam network requirements](https://help.steampowered.com/en/faqs/view/2EA8-4D75-DA21-31EB)
- [Steam Store](https://store.steampowered.com/)
- [Steam Community](https://steamcommunity.com/)
- Independent DNS and certificate checks for Steam-branded hosts

## Included rules

| Rule | Classification | Evidence | Reason |
| --- | --- | --- | --- |
| `DOMAIN-SUFFIX,steampowered.com` | core | Steam network requirements | Store, API, and client services |
| `DOMAIN-SUFFIX,steamcommunity.com` | core | Steam network requirements | Community and user-facing services |
| `DOMAIN-SUFFIX,steamgames.com` | core | Steam network requirements | Official proxy allowlist |
| `DOMAIN-SUFFIX,steam-chat.com` | core | DNS, certificates, and client traffic | Steam chat service |
| `DOMAIN-SUFFIX,steamusercontent.com` | dedicated-infrastructure | Steam network requirements | User content |
| `DOMAIN-SUFFIX,steamcontent.com` | dedicated-infrastructure | Steam network requirements | Game and depot content |
| `DOMAIN-SUFFIX,steamstatic.com` | dedicated-infrastructure | Steam network requirements | Static assets |
| `DOMAIN-SUFFIX,steamserver.net` | dedicated-infrastructure | DNS, registration, and client traffic | Steam server infrastructure |
| `DOMAIN,steamcdn-a.akamaihd.net` | official-dependency | Steam network requirements and DNS | Steam-specific CDN host |
| `DOMAIN,steamcommunity-a.akamaihd.net` | official-dependency | Official Steam Community pages | Steam Community assets |
| `DOMAIN,steamstore-a.akamaihd.net` | official-dependency | DNS and certificates | Steam Store assets |
| `DOMAIN,steamusercontent-a.akamaihd.net` | official-dependency | Official Steam Community pages | Steam user content |

## Rejected candidates

| Candidate | Source discovered from | Decision | Reason |
| --- | --- | --- | --- |
| `DOMAIN-SUFFIX,akamaihd.net` | Steam network requirements | reject: shared-infrastructure / too-broad | Only Steam-branded exact hosts are accepted |
| `DOMAIN-SUFFIX,akamaized.net`, `cloudfront.net`, `fastly.net` | Community comparison | reject: shared-infrastructure | Shared CDN namespaces without a Steam-specific boundary |
| Valve `AS32590` as an ASN rule | Steam network requirements | reject: asn-too-broad | Exceeds the HTTP service scope and client support is not uniform |
| Static Valve IP ranges | Community comparison | reject: stale | No stable first-party CIDR publication was found |
| `DOMAIN-KEYWORD,steam` | Community comparison | reject: keyword-too-broad | Can match unrelated domains |

## Notes

Steam's official support page tells proxies to allow all of `akamaihd.net`.
That is too broad for a routing rule, so the generated assets use four exact,
Steam-branded Akamai hosts that were independently verified. No ASN matcher is
used.
