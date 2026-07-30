---
name: liquid-glass-web
description: Add Apple-style "liquid glass" with real refraction to web/React UIs — tab bars, headers, bottom sheets, buttons, cards. Uses a canvas-generated displacement map driving an SVG feDisplacementMap through backdrop-filter, so the backdrop genuinely bends at the edges instead of just blurring. Use this whenever the user asks for liquid glass, glassmorphism, iOS 26-style UI, frosted glass with refraction, a "glass" tab bar/navbar/sheet/pill, or wants existing flat-blur glass upgraded to look refractive — even if they don't say "refraction" explicitly.
---

# Liquid Glass for Web UIs

Real refraction, not just `backdrop-filter: blur()`. The technique (from
samasante/liquid-glass): render a **displacement map** on a canvas — each
pixel's R/G channels encode how far the backdrop should be pulled toward the
center at that point — feed it to an SVG `feImage` + `feDisplacementMap`
filter, and apply it with `backdrop-filter: url(#filter)`. Whatever scrolls
behind the surface bends at the rim like it's under curved glass.

## The component

Copy `references/liquid-glass-component.tsx` into the project (it's
self-contained React + TypeScript, no dependencies). It exports
`<LiquidGlass className style frost wobble />`:

- Measures itself with a `ResizeObserver` and rebuilds the displacement map
  when its size changes.
- `frost` — blur (px) layered under the refraction. Use ~1 for small chrome
  (pills, buttons) where clarity sells the effect, ~10 for headers, ~14+ for
  sheets where text legibility over busy content matters.
- `wobble` — when this value changes (pass e.g. the active tab id), the
  displacement scale overshoots ~2.4× and rings down over 550ms: the glass
  "settles". Mount-time value is skipped.

In this repo the component already lives at `src/components/LiquidGlass.tsx`
— use it directly rather than re-copying. For non-React projects, port the
same pieces: `buildDisplacementMap()` is plain canvas code, and the SVG
filter is three elements.

## Browser support — get this right

Only **Chromium** applies SVG filter references inside `backdrop-filter`.
Safari and Firefox parse `url(#...)` fine but render nothing, so feature
detection via `CSS.supports()` alone is a trap. Gate on
`CSS.supports('backdrop-filter', 'url(#x)')` **and** a Chromium UA check,
and fall back to plain frosted blur (`blur(16px) saturate(1.5)`).
Remember iOS Chrome is `CriOS` (WebKit underneath) — the regex
`/Chrom(e|ium)/` correctly excludes it.

## The encoding math (if porting or debugging)

`feDisplacementMap` offsets each pixel by `scale * (channel − 0.5)`. So
encode `channel = dx / (2·maxScale) + 0.5` and set the filter's `scale`
attribute to `2·maxScale`. (The original repo encodes `dx/maxScale + 0.5`,
which clips at the extremes — the ×2 form is exact.) The lens shape is a
rounded-rect SDF in centered UV space: zero displacement in the middle,
ramping up through the edge band — that edge ramp is what reads as a curved
rim.

## Layering rules — where sessions actually lose time

These stacking mistakes are invisible in code review and obvious on screen:

1. **Refraction needs something behind it.** A bar sitting *below* the
   scroll area in a flex column refracts nothing. Float glass chrome over
   the content (`position: absolute` over the scroll view) and give scroll
   containers bottom/top clearance so content can escape it.

2. **Tint goes on the glass layer, not the container.** `backdrop-filter`
   samples everything painted beneath the element — including its parent's
   background. Keep the container transparent and put the translucent tint
   as the glass layer's own `background`; it then paints *above* the
   filtered backdrop instead of being part of it.

3. **Keep content sharp.** A positioned glass layer paints above
   non-positioned siblings, which means it would refract the very text it
   sits behind. Two fixes:
   - **Raise the content**: give sibling content `position: relative;
     z-index: 1`. Use when children are all elements.
   - **Sink the glass**: `z-index: -1` on the glass layer plus
     `position: relative; isolation: isolate` on the host. This slots the
     glass between the host's background and *all* content, including bare
     text nodes — best for buttons, where wrapping text in spans is churn.
     (`isolation` keeps the negative z-index from escaping behind the host.)

4. **`pointer-events: none` on every glass layer** — it overlays
   interactive regions.

5. **No double filtering.** If the host already had
   `backdrop-filter: blur(...)`, remove it when adding the glass layer;
   otherwise the lens output gets blurred again (and descendants' backdrop
   sampling behaves unpredictably once the host is itself a backdrop root).

6. One `LiquidGlass` per surface is cheap (a small canvas + data-URL per
   size change); a dozen buttons on a screen is fine.

## Making it look like glass, not gray plastic

Refraction alone isn't enough if the fills are heavy:

- **Thin fill**: ~`rgba(255,255,255,0.04)` body; heavy white fills
  (`0.08+`) read as smoked plastic.
- **Bright rim**: 1px border ~`rgba(255,255,255,0.22–0.24)` plus a 1px
  white inset top highlight and a dark inset bottom edge — the dual rim is
  what sells curvature.
- **Specular sweep**: a radial gradient from the top-left corner
  (white 0.2 → transparent) instead of gradients that end in dark corners.
- **Darker page background** makes every glass surface read more clearly.
- The effect is most striking over **detailed, moving backdrops** — maps,
  photos, scrolling lists. Over flat dark backgrounds it's subtle; that's
  expected, not a bug.
- **Active-pill pattern for tab bars**: strip per-button chrome entirely;
  render one absolutely-positioned glass pill that slides
  (`transform: translateX(index * 100%)`, springy transition) to the active
  slot, and pass the active id as `wobble`.
