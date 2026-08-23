# Telegram rule audit

## Scope

Telegram web, deep links, Bot API, Telegraph, branded CDN traffic, and the
official IPv4 and IPv6 networks Telegram publishes for client connectivity.

## Primary sources

- [Telegram](https://telegram.org/)
- [Telegram official CIDR list](https://core.telegram.org/resources/cidr.txt)
- [Telegram data-center documentation](https://core.telegram.org/api/datacenter)
- RIPE NCC route and registration data used as an independent cross-check

## Included rules

| Rule | Classification | Evidence | Reason |
| --- | --- | --- | --- |
| `DOMAIN-SUFFIX,telegram.org` | core | Telegram official site | Official web, API, and application namespace |
| `DOMAIN-SUFFIX,t.me` | core | Telegram official service | Official short links |
| `DOMAIN-SUFFIX,telegram.me` | core | Telegram official service | Official legacy links |
| `DOMAIN-SUFFIX,telegra.ph` | core | Telegram official service | Official Telegraph publishing service |
| `DOMAIN-SUFFIX,telegram-cdn.org` | dedicated-infrastructure | DNS and registration | Telegram-branded CDN namespace |
| `IP-CIDR,91.108.56.0/22,no-resolve` | dedicated-infrastructure | Telegram official CIDR file | Official client network |
| `IP-CIDR,91.108.4.0/22,no-resolve` | dedicated-infrastructure | Telegram official CIDR file | Official client network |
| `IP-CIDR,91.108.8.0/22,no-resolve` | dedicated-infrastructure | Telegram official CIDR file | Official client network |
| `IP-CIDR,91.108.16.0/22,no-resolve` | dedicated-infrastructure | Telegram official CIDR file | Official client network |
| `IP-CIDR,91.108.12.0/22,no-resolve` | dedicated-infrastructure | Telegram official CIDR file | Official client network |
| `IP-CIDR,149.154.160.0/20,no-resolve` | dedicated-infrastructure | Telegram official CIDR file | Official client network |
| `IP-CIDR,91.105.192.0/23,no-resolve` | dedicated-infrastructure | Telegram official CIDR file | Official client network |
| `IP-CIDR,91.108.20.0/22,no-resolve` | dedicated-infrastructure | Telegram official CIDR file | Official client network |
| `IP-CIDR,185.76.151.0/24,no-resolve` | dedicated-infrastructure | Telegram official CIDR file | Official client network |
| `IP-CIDR6,2001:b28:f23d::/48,no-resolve` | dedicated-infrastructure | Telegram official CIDR file | Official client network |
| `IP-CIDR6,2001:b28:f23f::/48,no-resolve` | dedicated-infrastructure | Telegram official CIDR file | Official client network |
| `IP-CIDR6,2001:67c:4e8::/48,no-resolve` | dedicated-infrastructure | Telegram official CIDR file | Official client network |
| `IP-CIDR6,2001:b28:f23c::/48,no-resolve` | dedicated-infrastructure | Telegram official CIDR file | Official client network |
| `IP-CIDR6,2a0a:f280::/32,no-resolve` | dedicated-infrastructure | Telegram official CIDR file | Official client network |

## Rejected candidates

| Candidate | Source discovered from | Decision | Reason |
| --- | --- | --- | --- |
| `95.161.64.0/20` | RIPE NCC routing and registration | reject: unverified for client scope | Telegram omits it from its official client CIDR publication |
| Entire Telegram ASNs | RIPE NCC routing data | reject: asn-too-broad | Route membership changes and the official CIDR list is more precise |
| Individual data-center IPs from `help.getConfig` | Telegram data-center docs | reject: stale | Telegram says endpoints can change frequently |
| `fragment.com`, `telesco.pe`, `telegram.dog` | Community comparison | reject: out-of-scope / unverified | No core Telegram client requirement |
| `DOMAIN-KEYWORD,telegram` | Community comparison | reject: keyword-too-broad | Can match unrelated domains |

## Notes

Every IP rule carries `no-resolve`. The canonical list follows Telegram's own
published CIDR file exactly; RIPE data is a cross-check, not a substitute for
the service's explicit publication.
