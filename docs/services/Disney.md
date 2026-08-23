# Disney+ rule audit

## Scope

Disney+ web and configuration traffic, Disney Streaming Services delivery, and
the Disney-specific BAMGrid API, connection, content, and playback hosts.

## Primary sources

- [Disney+](https://www.disneyplus.com/)
- [Public registration for dssott.com](https://www.whois.com/whois/dssott.com)
- Independent DNS, CNAME, certificate, and service-traffic verification for the exact BAMGrid hosts

## Included rules

| Rule | Classification | Evidence | Reason |
| --- | --- | --- | --- |
| `DOMAIN-SUFFIX,disneyplus.com` | core | Disney+ official site | Official application namespace |
| `DOMAIN-SUFFIX,disney-plus.net` | core | WHOIS, DNS, and service traffic | Disney+ configuration namespace |
| `DOMAIN,disney.api.edge.bamgrid.com` | dedicated-infrastructure | DNS, certificates, and service traffic | Disney-specific API host |
| `DOMAIN,disney.connections.edge.bamgrid.com` | dedicated-infrastructure | DNS, certificates, and service traffic | Disney-specific connection host |
| `DOMAIN,disney.content.edge.bamgrid.com` | dedicated-infrastructure | DNS, certificates, and service traffic | Disney-specific content host |
| `DOMAIN,disney.playback.edge.bamgrid.com` | dedicated-infrastructure | DNS, certificates, and service traffic | Disney-specific playback and license host |
| `DOMAIN-SUFFIX,dssott.com` | dedicated-infrastructure | WHOIS, DNS, and service traffic | Disney Streaming Services namespace registered to Disney Enterprises |

## Rejected candidates

| Candidate | Source discovered from | Decision | Reason |
| --- | --- | --- | --- |
| `DOMAIN-SUFFIX,bamgrid.com` | Service traffic and community comparison | reject: shared-infrastructure / too-broad | BAMGrid also supports other Disney streaming products; exact hosts are used |
| `global.edge.bamgrid.com`, `content.global.edge.bamgrid.com` | Independent service-traffic research | reject: shared-infrastructure | Not Disney+-specific |
| `conviva.com`, `braze.com`, `branch.io`, `newrelic.com`, `onetrust.com` | Independent service-traffic research | reject: shared-infrastructure | Third-party vendors without a Disney+-specific stable boundary |
| `disney.com` | Community comparison | reject: too-broad | Covers the wider Disney ecosystem |
| CloudFront or Disney Streaming ASNs | DNS and route research | reject: asn-too-broad | Infrastructure is shared or broader than Disney+ |

## Notes

The set intentionally keeps BAMGrid entries exact. `dssott.com` is acceptable
as a suffix because public registration identifies Disney Enterprises and the
namespace is dedicated to Disney Streaming Services delivery.
