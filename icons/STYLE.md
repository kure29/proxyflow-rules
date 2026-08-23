# ProxyFlow Service Mark Style Guide

## Purpose

ProxyFlow Service Marks help people identify third-party services quickly in routing and rule-selection interfaces. They are not ProxyFlow product logos, and they must never be presented as ProxyFlow-owned trademarks.

This guide is the permanent standard for every service mark added to this repository.

## Asset Principles

- Start with official brand geometry and a traceable official source.
- Store the mark as a transparent SVG with a practical, proportional `viewBox`.
- Prefer an official monochrome, black, white, or single-color mark.
- Use `currentColor` only when the brand provides or permits monochrome use.
- Keep fixed official colors when recoloring is not clearly permitted.
- Do not embed a badge, background, hover treatment, selected outline, or shadow in the SVG.
- Do not add decorative effects, gradients, strokes, or details. An official gradient that is part of a fixed-color mark may be retained.
- Do not stretch, compress, rotate, redraw, or otherwise alter brand geometry.
- Safe markup cleanup may remove editor metadata, comments, unnecessary namespaces, redundant groups, and hard-coded `width` or `height` attributes.

Logo assets and UI presentation are separate layers. A file in this directory contains only the reusable service mark; the ProxyFlow interface owns its badge and interaction states.

## File Naming

Use the service's common English name in lowercase ASCII, with no spaces or special characters:

- `openai.svg`
- `claude.svg`
- `youtube.svg`

Do not encode a theme, size, or state in the filename.

## Badge Presentation

Recommended ProxyFlow UI sizing:

| Size | Container | Radius | Approximate logo area |
| --- | --- | --- | --- |
| Small | 28 × 28px | 7px | 16–18px |
| Default | 32 × 32px | 8px | 18–20px |
| Large | 36 × 36px | 9px | 20–22px |

Center the logo optically and avoid heavy shadows. These values belong to the UI and must not be written into the SVG asset.

## Light Theme

- **Default:** very light gray-blue badge with a deep slate-blue icon.
- **Hover:** pale blue badge with a ProxyFlow blue icon.
- **Selected:** soft selected-blue badge, a clear ProxyFlow blue icon, and a thin blue outline.

Use flat color and restrained contrast. Do not add glow.

## Dark Theme

- **Default:** dark slate badge with a light neutral icon.
- **Hover:** slightly elevated dark slate badge with a light blue icon when brand rules permit it.
- **Selected:** dark badge, light icon, and a thin ProxyFlow blue outline.

State should remain legible without glow, glass effects, or heavy shadow.

## Color Behavior

`currentColor` is the preferred implementation for officially permitted monochrome marks. ProxyFlow UI state tokens then control the mark's color.

Some brands only permit specific monochrome colors. For those assets, `currentColor` is still useful for light/dark switching, but consumers must restrict it to the approved neutral palette instead of applying ProxyFlow blue. In the initial set this restriction applies to OpenAI, Disney+, YouTube, GitHub, and Steam; see `SOURCES.md` for the evidence and exact handling.

A **Fixed Brand Color Exception** is required when an official mark must retain its supplied color treatment. Fixed-color assets do not inherit the UI icon color; their surrounding badge and outline still communicate Default, Hover, and Selected states. The initial exceptions are Claude, Google, Gemini, Netflix, and Telegram.

Never infer permission to recolor from technical convenience.

## Optical Sizing

Do not force every path into the same nominal box. A wide wordmark, circular symbol, dense glyph, and open geometric mark can use different `max-width`, `max-height`, or scale values in the UI while retaining their original SVG geometry and aspect ratio.

Tune optical size only in the presentation layer. The goal is comparable visual weight, not identical path dimensions. Review compact horizontal marks such as Netflix and Disney+ especially carefully at small sizes.

## Consistency Rules

Before accepting a mark, inspect it beside every existing Service Mark and verify:

- clarity at 16px, 20px, and 24px, with a 32px inspection view;
- Light and Dark Mode visibility;
- Default, Hover, and Selected state clarity;
- comparable visual weight and centering;
- no unusually heavy, light, large, or small mark;
- no prohibited recoloring;
- transparent asset canvas with no embedded badge or UI treatment.

The zero-dependency `preview.html` is the reference QA surface for these checks.

## Trademark Rules

All logos, names, and trademarks belong to their respective owners. ProxyFlow uses them only to identify the corresponding third-party services and does not relicense them.

The repository's root MIT License applies to original ProxyFlow-authored material. It does not make third-party trademarks or brand assets MIT-licensed, waive trademark restrictions, or grant rights beyond those provided by the relevant owners.

## Adding A New Service

1. Find the official source.
2. Check the current brand guidelines.
3. Download the official vector asset when available.
4. Preserve geometry, proportions, orientation, and spacing.
5. Determine whether monochrome use is explicitly available or permitted.
6. Use `currentColor` only when that determination supports it.
7. Add the transparent SVG asset.
8. Update `SOURCES.md` with the exact provenance and modifications.
9. Update `preview.html`.
10. Perform visual QA with every existing mark in all documented sizes, themes, and states.
11. Validate security and provenance before committing.

Never add a new service icon without updating `SOURCES.md`.
