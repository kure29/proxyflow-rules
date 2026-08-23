# ProxyFlow Rules

First-party routing rule sets maintained for ProxyFlow.

Rules are organized by target proxy client.

- Mihomo: available
- Surge: not yet available
- Loon: not yet available

This repository contains the built-in service rules used by ProxyFlow. The
initial release targets Mihomo `classical` rule-providers only. Rules describe
what traffic matches a service; proxy groups and routing policy belong in the
consumer configuration.

Accuracy and maintainability take priority over rule count. The lists are
intentionally conservative and are not intended to cover every endpoint a
service might use. China Mainland routing remains based on GEOSITE / GEOIP in
ProxyFlow and is not included here.

## Usage

```yaml
rule-providers:
  openai:
    type: http
    behavior: classical
    format: yaml
    url: https://raw.githubusercontent.com/kure29/proxyflow-rules/main/rules/mihomo/OpenAI.yaml

rules:
  - RULE-SET,openai,Proxy
```

## Validation

The dependency-free validator checks the supported YAML subset, payload
structure, matcher types, rule syntax, CIDR values, and duplicate rules.

```sh
node scripts/validate-rules.mjs
```

## Maintenance and provenance

Rules are independently compiled from official service documentation, official
service domains, public network information published by the service, and
direct DNS/registration checks. Third-party rule files are not copied.

Primary references include:

- [OpenAI network recommendations](https://help.openai.com/en/articles/9247338-network-recommendations-for-chatgpt-errors-on-web-and-apps) and [OpenAI API documentation](https://platform.openai.com/docs/api-reference)
- [Anthropic enterprise network configuration](https://code.claude.com/docs/en/corporate-proxy)
- [Google hostname allowlist](https://support.google.com/a/answer/6334001), [Gemini API reference](https://ai.google.dev/api), and [YouTube embed guidance](https://support.google.com/youtube/answer/171780)
- [Telegram's published CIDR list](https://core.telegram.org/resources/cidr.txt)
- [GitHub restricted-network guidance](https://docs.github.com/en/get-started/using-github/allowing-access-to-githubs-services-from-a-restricted-network) and [Meta API](https://api.github.com/meta)
- [Steam network requirements](https://help.steampowered.com/en/faqs/view/2EA8-4D75-DA21-31EB)
- [Netflix](https://www.netflix.com/) and [Netflix Open Connect](https://openconnect.netflix.com/), supplemented by public WHOIS and DNS verification for dedicated `nflx*` delivery domains
- [Disney+](https://www.disneyplus.com/) and [Disney's public description of BAMTech](https://thewaltdisneycompany.com/app/uploads/2017-Annual-Report.pdf), supplemented by public WHOIS and DNS verification for dedicated Disney streaming domains

## License

MIT
