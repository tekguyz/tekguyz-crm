# Brand Application Pass — design

**Date:** 2026-08-14
**Status:** approved, not yet implemented

Follow-on to the Brand Identity "Converging Funnel" initiative, which produced
the mark and its asset pipeline but stopped at metadata. This pass applies the
mark to the three surfaces where it is currently either broken or absent.

Scoped to visual work only. The SEO/metadata copy pass and the test-data
cleanup rule are a deliberate second pass — they need a different kind of
review and share no machinery with this one.

---

## Context: what `build_brand.py` is for

Worth recording because it was a live question. Every asset under
`public/brand/` and `public/icons/` is one shared geometry — `FUNNEL`, `HEXES`,
`CONNECTORS`, declared once at the top of `scripts/brand/build_brand.py` —
rendered with different *parameters*. The apple-touch icon and the Android
maskable icon already demonstrate this: both are the same mark called with
`bg="#FFFFFF"` and a `pad_ratio` (lines 414 and 419).

So a plated favicon is not a new drawing. It is the existing `raster()` with a
different `bg` and `ink`. The master-geometry approach is exactly what makes
that safe — which was the intuition behind the question, and it is correct.

The one genuine gap: `raster()` has no rounded-corner support. A favicon needs
the radius **baked into the pixels**, because unlike an iOS touch icon or an
Android maskable icon, no OS ever rounds a `favicon.ico` for you. That is a
real addition to the script rather than a hand-edit of an output file, so it
stays inside the rule: fix the pipeline, re-run, never touch `public/`.

---

## 1. Favicon — blue plate

**Problem.** The mark's structure is carried by `#1A1A1A` ink. On a dark Chrome
tab the ink is nearly the tab colour, so the mark dissolves. The reduced
variant is worse, being mostly outline.

**Decision.** A rounded blue plate (`#3B6FE0`, the logo blue) with the mark in
white on top. Chosen over a theme-aware SVG favicon, which only Chrome and
Firefox honour — Safari and any `.ico` fallback would still show the invisible
version, so it fixes the symptom on some browsers and hides it on the rest.

**Implementation.**

- Add a `radius_ratio` parameter to `raster()`. When set, the background is
  drawn with `ImageDraw.rounded_rectangle` on the supersampled canvas rather
  than as a flat fill, so the corner antialiasing survives the LANCZOS
  downsample.
- Generate the plated set with `ink="#FFFFFF"`, `blue=None`, `bg=BLUE`.
  `blue=None` drops the separate funnel fill — a blue fill on a blue plate is
  invisible, and the white outline alone reads cleaner at 16px.
- `pad_ratio=0.10`. Deliberately tight: the brief asks for the mark to be as
  large as it can be. The reduced mark is 455x341, wider than tall, so it fits
  to width and centres vertically with natural slack. 0.10 keeps the widest
  point clear of the corner curve.
- Sizes: 16, 32, 48 PNG plus the multi-frame `.ico`. Reduced geometry
  throughout — the existing ≤32px rule, extended to 48 here because the plate
  eats usable area and the nodes stop resolving sooner inside it.

**Left alone deliberately.** `apple-touch-icon-180`, the maskable icon, and the
192/512 PWA icons keep their white plate. iOS and Android both composite these
against their own backgrounds and already round them; changing those is a
different decision about the home-screen icon, not the tab.

## 2. OG card

**Problems, in order of severity.**

1. **It never rendered for any crawler.** The auth middleware redirected
   `/opengraph-image` to `/login`. A signed-in human sees the real image
   because they carry the session cookie; Slack, Facebook and Vercel's own
   inspector got `307 → Redirecting...`. Fixed ahead of this spec in
   `src/lib/supabase/middleware.ts` via an `isPublicMetadataRoute` allowlist
   also covering the manifest, icons, robots and sitemap.
2. Layout is left-aligned at `padding: 0 96px` with the icon and text in a row,
   so the tagline hangs off to the right of the mark rather than reading as
   part of one unit.
3. The icon is 168px inside a 1200x630 frame — small, and it is the only part
   of the card that is actually distinctive.

**Decision.** One centred vertical block: icon on top, wordmark under it,
tagline under that. Icon roughly doubles. Everything is optically centred as a
single stack.

Additional improvements folded in:

- Add a hairline rule between wordmark and tagline to separate the two type
  roles, matching the design system's structure-from-hairlines principle.
- Set the canvas to `#FAFAFA` — already correct, but pin it as a decision so it
  matches the light-theme `themeColor` rather than drifting to white.

## 3. Mark placement in the app

The mark currently appears **nowhere in the running application**. Two
surfaces, both of which today render the product name as plain text.

- **`src/components/shell/Sidebar.tsx`, line 20.** The 14px-tall header block
  reads `TEKGUYZ CRM` as a bare `<span>`. Replace with the reduced mark plus
  the wordmark text.
- **`src/app/(auth)/layout.tsx`.** A single shared layout wraps login, signup,
  forgot-password, reset-password and onboarding, so one edit covers all of
  them. Currently a small bold `TEKGUYZ CRM` paragraph above the form. Replace
  with the full mark, centred, above the card's heading.

**Theme handling.** A `BrandMark` component renders both the light and the
on-dark SVG and toggles them with `dark:hidden` / `hidden dark:block`. This is
a CSS swap, so there is no hydration flash and no dependency on reading theme
state in JS. It satisfies the standing rule that dark surfaces use the
`-on-dark` asset and that `filter: invert()` is never used — invert would flip
the blue and teal along with the ink.

**Size rule applies.** The sidebar mark is small, so it uses the reduced
variant. The auth mark is large enough for the full one.

---

## Non-goals

- No change to the wordmark lockup SVGs or their geometry.
- No new brand colours. `#3B6FE0` is used as a plate fill here, which stays
  inside the existing rule that logo colours live in the mark only and are
  never adopted as UI tokens.
- No mark in the Header, empty states, or loading states. The sidebar already
  carries persistent brand presence within the app shell; repeating it in the
  header would be redundant at this density.

## Verification

- Re-run the pipeline and confirm the emitted favicon differs from the current
  one and that the `.ico` still carries three frames.
- Check the plated icon by eye at 16px against both a light and a dark tab.
- Fetch `/opengraph-image` with no cookie and confirm a `200 image/png`, not a
  `307`. This is the check that would have caught the original bug.
- Load `/design`, the sidebar, and an auth page in both themes.
- `npm run build`, `npm run lint`, `npx tsc --noEmit`, `npm test`.
