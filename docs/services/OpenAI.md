# OpenAI rule audit

## Scope

ChatGPT web and native apps, OpenAI API traffic, authentication, file delivery,
WebSocket connections, first-party static assets, and the exact third-party
hosts that OpenAI currently names in its network recommendations.

## Primary sources

- [OpenAI network recommendations](https://help.openai.com/en/articles/9247338-network-recommendations-for-chatgpt-errors-on-web-and-apps)
- [OpenAI API reference](https://platform.openai.com/docs/api-reference)
- [blackmatrix7 OpenAI list](https://github.com/blackmatrix7/ios_rule_script/blob/master/rule/Surge/OpenAI/OpenAI.list), used only to discover candidates; the repository is GPL-2.0 and no rule content was copied

## Included rules

| Rule | Classification | Evidence | Reason |
| --- | --- | --- | --- |
| `DOMAIN-SUFFIX,openai.com` | core | OpenAI network recommendations and API reference | Official API, authentication, and service namespace |
| `DOMAIN-SUFFIX,chatgpt.com` | core | OpenAI network recommendations | Official web, app, and WebSocket namespace |
| `DOMAIN-SUFFIX,oaistatic.com` | core | OpenAI network recommendations | Official static assets |
| `DOMAIN-SUFFIX,oaiusercontent.com` | core | OpenAI network recommendations | Official file and user-content delivery |
| `DOMAIN-SUFFIX,oaistatsig.com` | core | OpenAI network recommendations | Officially named OpenAI Statsig namespace |
| `DOMAIN,cdn.openaimerge.com` | core | OpenAI network recommendations | Exact official CDN host; intentionally not the whole suffix |
| `DOMAIN-SUFFIX,ct.sendgrid.net` | official-dependency | OpenAI network recommendations | Official wildcard entry |
| `DOMAIN-SUFFIX,intercom.io` | official-dependency | OpenAI network recommendations | Official wildcard entry |
| `DOMAIN-SUFFIX,intercomcdn.com` | official-dependency | OpenAI network recommendations | Official wildcard entry |
| `DOMAIN,cdn.workos.com` | official-dependency | OpenAI network recommendations | Exact official WorkOS host |
| `DOMAIN,challenges.cloudflare.com` | official-dependency | OpenAI network recommendations | Exact official Cloudflare host |
| `DOMAIN,forwarder.workos.com` | official-dependency | OpenAI network recommendations | Exact official WorkOS host |
| `DOMAIN,humb.apple.com` | official-dependency | OpenAI network recommendations | Exact official Apple host |
| `DOMAIN,images.workoscdn.com` | official-dependency | OpenAI network recommendations | Exact official WorkOS CDN host |
| `DOMAIN,js.stripe.com` | official-dependency | OpenAI network recommendations | Exact official Stripe host |
| `DOMAIN,o207216.ingest.sentry.io` | official-dependency | OpenAI network recommendations | Exact official Sentry tenant |
| `DOMAIN,o33249.ingest.sentry.io` | official-dependency | OpenAI network recommendations | Exact official Sentry tenant |
| `DOMAIN,rum.browser-intake-datadoghq.com` | official-dependency | OpenAI network recommendations | Exact official Datadog RUM host |
| `DOMAIN,setup.workos.com` | official-dependency | OpenAI network recommendations | Exact official WorkOS host |
| `DOMAIN,workos.imgix.net` | official-dependency | OpenAI network recommendations | Exact official WorkOS Imgix host |

## Rejected candidates

| Candidate | Source discovered from | Decision | Reason |
| --- | --- | --- | --- |
| `DOMAIN-SUFFIX,openaimerge.com` | Existing ProxyFlow baseline | reject: too-broad | Replaced by the one exact host OpenAI publishes |
| `DOMAIN-SUFFIX,stripe.com`, `sentry.io`, `datadoghq.com`, `workos.com`, `cloudflare.com`, `apple.com`, `imgix.net` | blackmatrix7 and dependency boundary review | reject: shared-infrastructure / too-broad | Exact official hosts are used instead |
| `chatgpt.livekit.cloud`, `host.livekit.cloud`, `turn.livekit.cloud` | blackmatrix7 | reject: unverified | LiveKit names are absent from the current official allowlist |
| `ai.com`, `algolia.net`, `api.statsig.com`, `events.statsigapi.net`, `featuregates.org`, `launchdarkly.com`, `observeit.net`, `segment.io` | blackmatrix7 | reject: unverified | No current OpenAI requirement found |
| `auth0.com`, `identrust.com`, `client-api.arkoselabs.com` | blackmatrix7 | reject: shared-infrastructure / unverified | Broad vendor namespaces were not justified by current official material |
| `browser-intake-datadoghq.com` | blackmatrix7 | reject: unverified | OpenAI publishes the narrower `rum.browser-intake-datadoghq.com` host |
| `chat.openai.com.cdn.cloudflare.net`, `static.cloudflareinsights.com` | blackmatrix7 | reject: unverified | Not present in the current official recommendations |
| `openai-api.arkoselabs.com`, `openaiapi-site.azureedge.net`, `openaicom.imgix.net` | blackmatrix7 | reject: stale / unverified | Candidate-only names without current official confirmation |
| `openaicom-api-bdcpf8c6d2e9atf6.z01.azurefd.net`, `openaicomproductionae4b.blob.core.windows.net`, `production-openaicom-storage.azureedge.net` | blackmatrix7 | reject: stale / unverified | Deployment-specific candidates without current official confirmation |
| `DOMAIN-KEYWORD,openai` | blackmatrix7 | reject: keyword-too-broad | Can match unrelated domains containing the string |
| `24.199.123.28/32`, `64.23.132.171/32` | blackmatrix7 | reject: stale / unverified | Point IPs were not published by OpenAI |
| `IP-ASN,20473` | blackmatrix7 | reject: asn-too-broad | The ASN hosts unrelated tenants and is not an OpenAI boundary |

## Notes

`openai.com` already covers `api.openai.com`, `auth0.openai.com`,
`setup.auth.openai.com`, and other official subdomains, so redundant exact rules
are omitted. `chatgpt.com` covers the web and native-app hosts and the documented
WebSocket upgrade target. File delivery is covered by `oaiusercontent.com`.
WorkOS, Stripe, Datadog, Sentry, Intercom, Cloudflare, and Apple are included
only at the precision OpenAI publishes. Community entries that matched the
final set were accepted only after independent confirmation in OpenAI's own
documentation.
