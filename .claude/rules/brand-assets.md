---
paths:
  - "scripts/brand/**"
  - "public/brand/**"
  - "public/icons/**"
  - "src/lib/brand/**"
  - "src/components/brand/**"
  - "src/app/manifest.ts"
  - "src/app/opengraph-image.tsx"
  - "src/app/layout.tsx"
  - "src/lib/supabase/middleware.ts"
---

# Brand assets, the mark, and crawler-readable routes

- **Brand assets are generated, never hand-edited.** `scripts/brand/build_brand.py` is the single source of truth for the mark's geometry, every SVG, every raster, and the outlined wordmark. Editing a file in `public/brand/` or `public/icons/` directly is a bug — the next pipeline run silently reverts it. Fix the script and re-run.
- **The mark has two colour variants and the theme picks one.** Its structure is carried entirely by ink outlines; on dark canvases `#1A1A1A` vanishes and the mark collapses into disconnected shapes. Dark surfaces use `icon-on-dark.svg` / `lockup-*-dark.svg`. **Never `filter: invert()`** — it flips the blue and teal too.
- **The mark themes through the `--brand-mark` CSS variable, never a `dark:` utility.** This codebase uses no `dark:` variants at all, and Tailwind v4 maps `dark:` to `prefers-color-scheme` rather than the `.dark` class — so a class-based swap would ignore the theme toggle and break the nested panes on `/design`.
- **The mark has a reduced variant at small sizes, and that is not optional** — the nodes cannot resolve at favicon scale. Exact thresholds and which asset applies: `docs/DESIGN.md` § Brand Identity → Two hard rules. Do not "simplify" this back to one asset.
- **The wordmark is always outlined, never live `<text>`.** A logo carrying `font-family="Inter"` renders correctly in the app and silently falls back to a system stack in email, decks, and on other machines — no error, green build. The pipeline outlines it from the real Inter TTF.
- **Logo colours are not UI tokens.** `#3B6FE0` / `#2FA679` / `#16976B` live in the mark only. No component consumes them. The decorative pill palette and `--accent` remain the only sanctioned colour sources for UI.
- **Outward-facing copy has one home: `BRAND` in `src/lib/brand/copy.ts`** (`name`, `shortName`, `description`, `tagline`). Import it; never retype the literal. These were duplicated across `layout.tsx`, `manifest.ts` and `opengraph-image.tsx` — same drift shape as a hand-copied primitive, except the stale copy is the one a stranger sees.

**No App Router icon-convention file may exist under `src/app/`.** `favicon.ico`,
`icon.*` and `apple-icon.*` there all take precedence over `public/` and over
`metadata.icons`. With one present the app serves it, the build passes, and the
wrong mark keeps shipping. Same silent-failure class as the Inter
`<body>`/`<html>` bug. All three were deleted on 2026-08-14; if one reappears,
that is the bug.

**Any route that exists to be read by a crawler must stay in the
`isPublicMetadataRoute` allowlist in `src/lib/supabase/middleware.ts`** —
`/opengraph-image`, `/twitter-image`, `/manifest.webmanifest`, `/robots.txt`,
`/sitemap.xml`, `/icons/`, `/brand/`. Crawlers and link unfurlers carry no
session cookie, so without the allowlist `updateSession` 307s every one of them
to `/login` while a signed-in human sees the real asset and the build stays
green — that is exactly how the OG card shipped broken to Slack and Vercel's own
inspector. None of it is tenant data. Check any new such route with a cookie-less
`curl`. Full history: `docs/ADDENDA_LOG.md` § Brand application pass.
