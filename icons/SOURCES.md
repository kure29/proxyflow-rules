# ProxyFlow Service Mark Sources

## Provenance policy

Official brand, press, documentation, repository, and first-party website assets are the authoritative sources for this directory. A third-party vector may be used only as a geometry-verification reference when the owner publishes no suitable machine-readable vector. Such use is called out explicitly below.

Markup cleanup never changes path geometry. `currentColor` is used only for an official monochrome treatment and may carry a brand-specific palette restriction. Each mark remains a trademark of its owner; the repository MIT License does not relicense any third-party mark.

## OpenAI

**Official source and brand guidelines:** <https://openai.com/brand/>

**Original asset:** [Blossom Light SVG](https://images.ctfassets.net/kftzwdyauwt9/3hUGLn3ypllZ0oa01qOYVq/28e8188e6f11b84c3e876569d492734f/Blossom_Light.svg), supplied on the official OpenAI brand page as a construction sheet containing the monochrome Blossom.

**Original format:** SVG

**Asset mode:** Monochrome

**Local file:** `openai.svg`

**Color handling:** `currentColor`, restricted to OpenAI's neutral monochrome treatment; do not apply arbitrary brand colors.

**Modification:**

- retained one official Blossom path from the construction sheet;
- removed construction guides and the duplicate presentation copy;
- cropped the `viewBox` to the retained mark's bounds;
- removed hard-coded dimensions and changed the official black fill to `currentColor`;
- path geometry is unchanged.

**Trademark:** OpenAI and its marks belong to their respective owner.

## Claude

**Official source and brand resources:** <https://www.anthropic.com/press-kit>

**Original asset:** `Claude Spark - Clay.svg` from Anthropic's official media-resource archive.

**Original format:** SVG

**Asset mode:** Official Clay color

**Local file:** `claude.svg`

**Color handling:** Official color retained. **Fixed Brand Color Exception.**

**Modification:**

- removed hard-coded dimensions and the redundant root `fill="none"`;
- retained the official `#D97757` fill;
- path geometry and `viewBox` are unchanged.

**Trademark:** Claude, Anthropic, and their marks belong to their respective owner.

## Google

**Official source:** the `google-logo-g` symbol embedded in Google's official [YouTube Brand Resources](https://brand.youtube/) page.

**Official brand guidelines:** <https://developers.google.com/identity/branding-guidelines>

**Official asset package checked:** [Google sign-in assets](https://developers.google.com/static/identity/images/signin-assets.zip)

**Original asset:** Four-color Google G vector symbol.

**Original format:** Inline SVG

**Asset mode:** Official four-color

**Local file:** `google.svg`

**Color handling:** Official colors retained. **Fixed Brand Color Exception.**

**Modification:**

- extracted the standalone G paths from the official inline symbol;
- removed the enclosing symbol identifier;
- path geometry, `viewBox`, and fills are unchanged.

**Trademark:** Google and its marks belong to their respective owner.

## Gemini

**Official source:** [Google-hosted Gemini sparkle SVG](https://www.gstatic.com/lamda/images/gemini_sparkle_v002_d4735304ff6292a690345.svg)

**Official design reference:** <https://design.google/library/gemini-ai-visual-design>

**Original asset:** Gemini sparkle.

**Original format:** SVG

**Asset mode:** Official radial gradient

**Local file:** `gemini.svg`

**Color handling:** Official gradient retained. **Fixed Brand Color Exception.**

**Modification:**

- removed hard-coded dimensions and redundant root fill;
- renamed the local gradient identifier to a descriptive, collision-resistant value;
- path geometry, gradient transform, stops, and `viewBox` are unchanged.

**Trademark:** Gemini, Google, and their marks belong to their respective owner.

## YouTube

**Official source and guidelines:** <https://brand.youtube/youtube-icon>

**Official asset package:** [YouTube icon archive](https://www.gstatic.com/marketing-cms/78/29/3e68a1414bb28d0b7e47b44c3c91/youtube-icon.zip)

**Original asset:** `yt_icon_almostblack_digital.eps`; the official package also supplies white and red EPS/AI/PNG variants but no SVG.

**Original format:** EPS

**Asset mode:** Official monochrome Almost Black/White

**Local file:** `youtube.svg`

**Color handling:** `currentColor`, restricted to the official Almost Black/White monochrome treatments; do not use arbitrary colors.

**Geometry-verification reference:** [Simple Icons YouTube SVG](https://github.com/simple-icons/simple-icons/blob/develop/icons/youtube.svg), used only because the official package lacks SVG. Simple Icons code is released under [CC0-1.0](https://github.com/simple-icons/simple-icons/blob/develop/LICENSE.md); trademark rights remain with YouTube.

**Modification:**

- represented the official monochrome geometry as one static SVG path using the CC0 vector reference;
- verified the silhouette and play aperture against YouTube's official EPS and PNG assets;
- set the monochrome fill to `currentColor`;
- no background, state styling, or decorative treatment was added.

**Trademark:** YouTube and its marks belong to their respective owner.

## Netflix

**Official source and brand guidelines:** <https://brand.netflix.com/en/assets/logos/>

**Original asset:** Netflix wordmark SVG served directly by the official brand portal: <https://images.ctfassets.net/y2ske730sjqp/821Wg4N9hJD8vs5FBcCGg/9eaf66123397cc61be14e40174123c40/Vector__3_.svg>

**Original format:** SVG

**Asset mode:** Official Netflix red

**Local file:** `netflix.svg`

**Color handling:** Official `#E50914` retained. **Fixed Brand Color Exception.**

**Modification:**

- removed hard-coded dimensions and redundant root fill;
- retained the official wordmark because the portal's N-symbol vector download was not publicly retrievable during source verification;
- path geometry, `viewBox`, and fill are unchanged.

**Trademark:** Netflix and its marks belong to their respective owner.

## Disney+

**Official source:** <https://press.disneyplus.com/about/disney-plus-logo-2024>

**Official reference asset:** the high-resolution `Disney+ Logo - Black` raster offered by the official press gallery.

**Original asset:** Disney+ 2024 monochrome print mark.

**Original format:** PNG from the official source; SVG geometry verified separately

**Asset mode:** Official monochrome

**Local file:** `disney.svg`

**Color handling:** `currentColor`, restricted to neutral monochrome usage; do not apply ProxyFlow blue or other arbitrary colors.

**Geometry-verification reference:** [Wikimedia Commons Disney+ 2024 Print SVG](https://commons.wikimedia.org/wiki/File:Disney%2B_2024_(Print).svg), checked against the official 6,526 × 3,679 black press asset. The reference is identified as a public-domain text logo and remains subject to trademark restrictions.

**Modification:**

- removed XML/editor metadata, dimensions, and redundant namespace attributes;
- grouped the official monochrome paths under `currentColor`;
- retained the source `viewBox`, proportions, and path geometry unchanged.

**Trademark:** Disney+, Disney, and their marks belong to their respective owner.

## Telegram

**Official source:** <https://telegram.org/>

**Original asset:** [Telegram logo SVG](https://telegram.org/img/t_logo.svg) served by Telegram's official website.

**Original format:** SVG

**Asset mode:** Official blue gradient and white plane

**Local file:** `telegram.svg`

**Color handling:** Official colors retained. **Fixed Brand Color Exception.**

**Modification:**

- removed hard-coded dimensions, redundant groups, and presentation-only fill-rule attributes;
- renamed the local gradient identifier;
- retained the official circle, plane path, gradient values, and `viewBox` unchanged.

**Trademark:** Telegram and its marks belong to their respective owner.

## GitHub

**Official source and brand guidelines:** <https://brand.github.com/foundations/logo>

**Official asset package:** <https://brand.github.com/GitHub_Logos.zip>

**Original asset:** `GitHub_Invertocat_Black.svg` from GitHub's official logo archive.

**Original format:** SVG

**Asset mode:** Official monochrome

**Local file:** `github.svg`

**Color handling:** `currentColor`, restricted to GitHub's approved black/white neutral treatments.

**Modification:**

- removed hard-coded dimensions and a redundant clipping group whose rectangle matched the `viewBox`;
- changed the official black fill to `currentColor` for approved black/white theme switching;
- path geometry and `viewBox` are unchanged.

**Trademark:** GitHub and its marks belong to their respective owner.

## Steam

**Official source and brand guidelines:** <https://partner.steamgames.com/doc/marketing/branding>

**Official asset:** [Steam brand assets EPS](https://shared.fastly.steamstatic.com/community_assets/images/steamworks_docs/english/steam_brandAssets.eps)

**Original asset:** Steam symbol from Valve's approved black/white Steam artwork sheet.

**Original format:** EPS

**Asset mode:** Official monochrome black/white

**Local file:** `steam.svg`

**Color handling:** `currentColor`, restricted to the official black/white treatments.

**Geometry-verification reference:** [Simple Icons Steam SVG](https://github.com/simple-icons/simple-icons/blob/develop/icons/steam.svg), used only because Valve's official package is a binary EPS artwork sheet rather than a standalone SVG. Simple Icons code is released under [CC0-1.0](https://github.com/simple-icons/simple-icons/blob/develop/LICENSE.md); trademark rights remain with Valve.

**Modification:**

- represented the official symbol as one static SVG path using the CC0 vector reference;
- cross-checked the silhouette against the official Valve EPS preview;
- set the monochrome fill to `currentColor`;
- no geometry, background, or state styling was added.

**Trademark:** Steam, Valve, and their marks belong to their respective owner.
