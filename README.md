# ProxyFlow Rules

First-party routing rule sets maintained for ProxyFlow.

Rules are organized by target proxy client. The repository currently publishes
rule assets for Mihomo, Stash, Surge, Loon, Shadowrocket, and Quantumult X. This
describes the available rule syntax; it does not claim that every client is
integrated into the ProxyFlow application.

Accuracy and maintainability take priority over rule count. The lists are
intentionally conservative and do not promise complete or permanently accurate
coverage. China Mainland routing remains based on GEOSITE / GEOIP in ProxyFlow
and is not included here.

## Architecture

`sources/services/*.json` is the single canonical source for the ten service
sets. Each accepted matcher records its classification, evidence, and a primary
source reference. `scripts/generate-rules.mjs` deterministically produces every
client asset; files under `rules/` must not be edited by hand.

| Target | Generated path | Format |
| --- | --- | --- |
| Mihomo | `rules/mihomo/*.yaml` | classical YAML rule-provider |
| Stash | `rules/stash/*.yaml` | classical YAML rule-provider |
| Surge | `rules/surge/*.list` | policy-free typed rules |
| Loon | `rules/loon/*.list` | policy-free typed rules |
| Shadowrocket | `rules/shadowrocket/*.list` | policy-free typed rules |
| Quantumult X | `rules/quantumult-x/*.list` | `HOST`/`HOST-SUFFIX`/`HOST-KEYWORD` mapping with a service policy placeholder |

Mihomo and Stash are generated independently from the same canonical source and
have identical payload semantics. Stash's optimized `domain` and `ipcidr`
behaviors are useful for very large homogeneous sets; these small per-service
sets use `classical` so mixed matcher types stay in one auditable asset.

## Usage

### Mihomo

```yaml
rule-providers:
  openai:
    type: http
    behavior: classical
    format: yaml
    url: https://raw.githubusercontent.com/kure29/proxyflow-rules/main/rules/mihomo/OpenAI.yaml
    path: ./ruleset/openai.yaml
    interval: 86400

rules:
  - RULE-SET,openai,Proxy
```

### Stash

```yaml
rule-providers:
  openai:
    behavior: classical
    format: yaml
    url: https://raw.githubusercontent.com/kure29/proxyflow-rules/main/rules/stash/OpenAI.yaml
    interval: 86400

rules:
  - RULE-SET,openai,Proxy
```

### Surge

```ini
[Rule]
RULE-SET,https://raw.githubusercontent.com/kure29/proxyflow-rules/main/rules/surge/OpenAI.list,Proxy
```

### Loon

```ini
[Remote Rule]
https://raw.githubusercontent.com/kure29/proxyflow-rules/main/rules/loon/OpenAI.list,policy=Proxy,tag=OpenAI,enabled=true
```

### Shadowrocket

```ini
[Rule]
RULE-SET,https://raw.githubusercontent.com/kure29/proxyflow-rules/main/rules/shadowrocket/OpenAI.list,Proxy
```

### Quantumult X

```ini
[filter_remote]
https://raw.githubusercontent.com/kure29/proxyflow-rules/main/rules/quantumult-x/OpenAI.list,tag=OpenAI,force-policy=Proxy,enabled=true
```

Quantumult X output maps `DOMAIN` to `HOST`, `DOMAIN-SUFFIX` to
`HOST-SUFFIX`, `DOMAIN-KEYWORD` to `HOST-KEYWORD`, and `IP-CIDR6` to
`IP6-CIDR`. Each generated line contains the service name as a valid policy
placeholder; `force-policy=Proxy` overrides it when the remote filter is loaded.

## Generation and validation

The scripts use only Node.js built-in modules.

```sh
node scripts/generate-rules.mjs
node scripts/generate-rules.mjs --check
node scripts/validate-rules.mjs
```

The validator checks canonical JSON structure, matcher and host/CIDR syntax,
classification and source references, uniqueness, exact client file matrices,
per-client syntax, `no-resolve`, generated-file freshness, and semantic parity
across all six targets.

## Audits and provenance

The per-service decisions are documented under `docs/services/`. Accepted rules
are independently compiled from official documentation, official domains,
official public network information, and bounded DNS, certificate, registration,
or route verification. Rejected candidates and their reasons are recorded next
to the accepted scope.

Community rule repositories may be used to discover candidates, but they are
not accepted as final evidence and their rule files are not copied. In
particular, the GPL-2.0 blackmatrix7 OpenAI list was reviewed only as a candidate
index; every accepted overlap was independently confirmed from OpenAI's current
documentation.

## License

New content in this repository is licensed under the MIT License. No third-party
rule file has been copied or relicensed.
