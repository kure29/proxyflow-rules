# YouTube rule audit

## Scope

YouTube web and short links, privacy-enhanced embeds, media and image delivery,
and YouTube-specific API hosts. Shared Google OAuth and API hosts are not added
to this product-specific set.

## Primary sources

- [YouTube](https://www.youtube.com/)
- [YouTube embed guidance](https://support.google.com/youtube/answer/171780)
- [YouTube Data API reference](https://developers.google.com/youtube/v3/docs)

## Included rules

| Rule | Classification | Evidence | Reason |
| --- | --- | --- | --- |
| `DOMAIN-SUFFIX,youtube.com` | core | YouTube official service | Official application namespace |
| `DOMAIN-SUFFIX,youtu.be` | core | YouTube official service | Official short-link namespace |
| `DOMAIN-SUFFIX,googlevideo.com` | dedicated-infrastructure | Official service traffic and DNS | YouTube media delivery |
| `DOMAIN-SUFFIX,ytimg.com` | dedicated-infrastructure | YouTube API examples and DNS | YouTube images and static assets |
| `DOMAIN-SUFFIX,youtube-nocookie.com` | core | YouTube embed guidance | Official privacy-enhanced embeds |
| `DOMAIN,youtube.googleapis.com` | core | DNS, certificates, and service traffic | YouTube-specific API host |
| `DOMAIN,youtubei.googleapis.com` | core | Official service traffic | YouTube application API host |

## Rejected candidates

| Candidate | Source discovered from | Decision | Reason |
| --- | --- | --- | --- |
| `www.googleapis.com` | YouTube Data API docs | reject: shared-infrastructure | The API is path-scoped on a host shared by many Google APIs |
| `accounts.google.com`, `oauth2.googleapis.com` | YouTube authentication docs | reject: shared-infrastructure | Shared Google authentication belongs in Google |
| `DOMAIN-SUFFIX,googleusercontent.com`, `ggpht.com` | Community comparison | reject: shared-infrastructure | Used across many Google products |
| `youtubeeducation.com` | Google hostname allowlist | reject: feature-optional | Classroom-specific rather than core YouTube |
| `DOMAIN-KEYWORD,youtube` | Community comparison | reject: keyword-too-broad | Can match unrelated domains |
| Google IP ranges or ASNs | Public Google network information | reject: asn-too-broad | Not a YouTube-specific network boundary |

## Notes

The official Data API also uses `www.googleapis.com`, but a domain-only rule
cannot isolate its `/youtube/` paths. It is therefore rejected here instead of
capturing unrelated Google APIs.
