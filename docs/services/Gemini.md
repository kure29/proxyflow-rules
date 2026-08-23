# Gemini rule audit

## Scope

The Gemini web app, Gemini-branded namespace, Google AI Studio, and the public
Gemini API endpoint. Generic Google infrastructure stays in the Google set.

## Primary sources

- [Gemini web application](https://gemini.google.com/)
- [Gemini API reference](https://ai.google.dev/api)

## Included rules

| Rule | Classification | Evidence | Reason |
| --- | --- | --- | --- |
| `DOMAIN,gemini.google.com` | core | Gemini web app | Official Gemini web app |
| `DOMAIN-SUFFIX,gemini.google` | core | Gemini official domain | Official Gemini-branded namespace |
| `DOMAIN,aistudio.google.com` | core | Gemini API docs | Official Google AI Studio |
| `DOMAIN,generativelanguage.googleapis.com` | core | Gemini API reference | Documented Gemini API service endpoint |

## Rejected candidates

| Candidate | Source discovered from | Decision | Reason |
| --- | --- | --- | --- |
| `DOMAIN-SUFFIX,google.com` | Community comparison | reject: too-broad | Would merge Gemini with the general Google ecosystem |
| `DOMAIN-SUFFIX,googleapis.com` | Google API architecture | reject: shared-infrastructure | Belongs in Google; Gemini keeps only its exact API endpoint |
| `alkalimakersuite-pa.clients6.google.com`, `robinfrontend-pa.googleapis.com`, `proactivebackend-pa.googleapis.com` | Community comparison and observed traffic | reject: unverified | No stable public Gemini requirement was found |
| Google cloud IP ranges or ASNs | Public Google network information | reject: asn-too-broad | Shared across many services and tenants |
| `DOMAIN-KEYWORD,gemini` | Community comparison | reject: keyword-too-broad | Can match unrelated domains |

## Notes

Google and Gemini are intentionally separate. A request to the documented
`generativelanguage.googleapis.com` endpoint can match Gemini precisely without
turning the Gemini set into a general Google rule set.
