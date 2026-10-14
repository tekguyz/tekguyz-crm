# Retaking the showcase and social pictures

How to retake the CRM's pictures after the look changes. Written 2026-10-13,
during the shell redesign (#47). Nothing here is new tooling. It points to what
exists and lists the sizes.

## Read this first

- **Both tools photograph the LIVE demo** (`https://tekguyz-crm.vercel.app`),
  not localhost. A retake shows the new look only after the new look is on
  `main` and deployed. Push means live (Vercel). Confirm the deploy, then retake.
- **Wait until the redesign (#47) is merged and deployed.** Pictures taken
  before that show the old shell.
- A run opens one demo visit per device. The door allows **5 Guests an hour
  per IP**. Do not re-run ten times. If the door says "busy", wait an hour.
- Never restyle a picture. Cropping and WebP conversion are fine.
- Sample data only. Never a real person's or company's data.

## Two tools

| Tool | Command | What it makes |
|---|---|---|
| Repo script | `npm run showcase` | 8 PNGs in `showcase/`: Today, Pipeline, Contacts, Reports at desktop and phone. Light only (the CRM has no dark theme). |
| Capture tool | `node C:/Projects/claude-config/tools/capture/capture.mjs tekguyz-crm --out C:/Projects/tekguyz-crm/showcase` | The same screens, plus WebP copies, a 4.5 s video and poster, and social sizes. Reads `claude-config/tools/capture/apps/tekguyz-crm.json`. Full guide: `claude-config/tools/capture/README.md`. |

Use the capture tool when you need social sizes or the video. It needs
`npm install` once per laptop in `tools/capture`, plus Chrome and ffmpeg.

Flags: `--only NAME` (one screen, or `video`, or `reel`), `--no-video`,
`--keep-banner`.

## Sizes

### Showcase masters (made by both tools)

| Picture | Size | Notes |
|---|---|---|
| Desktop | 1440 x 900, exact | scale 1 |
| Phone | 780 x 1688 (390 x 844 at 2x) | |
| Video | 1440 x 900, 30 fps, about 4.5 s, no sound | `.webm` and `.mp4`, plus `-poster.webp`. Under 5 s on purpose. |

### Social (capture tool only)

| Picture | Size | Where it posts |
|---|---|---|
| `feed` | 1080 x 1350, 4:5 (540 x 675 at 2x) | Instagram feed, Facebook, Google Business Profile |
| `stories` | 1080 x 1920, 9:16 (540 x 960 at 2x) | Instagram and Facebook Stories |
| `reel` | 1080 x 1920, 9:16, about 4.5 s | Reels. Only if the config has `reel`. |

They post as they are: no crop, no resize. The 540 px width shows the app in
its phone layout, so the text reads on a phone. Frame the key part above the
fold. If it needs a scroll, fix the app, not the picture.

Source spec: `C:/Projects/tekguyz-one/growth/outreach/muse-work-pack/picture-specs.md`.
Check that file before trusting a size for a new platform (LinkedIn, Google
Business Profile cover, X).

### Brand files (generated, never hand-edited)

Made by `scripts/brand/build_brand.py`. To change one, fix the script and re-run.

| File | Size |
|---|---|
| `public/icons/favicon-16x16.png`, `-32x32`, `-48x48`, `-96x96` | 16, 32, 48, 96 |
| `public/icons/apple-touch-icon-180.png` | 180 x 180 |
| `public/icons/icon-192.png`, `icon-192-on-dark.png` | 192 x 192 |
| `public/icons/icon-512.png`, `icon-512-on-dark.png` | 512 x 512 |
| `public/icons/icon-maskable-512.png` | 512 x 512, safe zone for round crops |
| `public/icons/icon-1024-master.png` | 1024 x 1024 |
| `src/app/opengraph-image.tsx` (link preview card) | 1200 x 630 |
| `public/brand/*.svg` | icon, reduced icon, mono ink/white, horizontal and stacked lockups, light and dark |

Mark rules: reduced icon at 32 px and below; full mark at 48 px and above;
dark surfaces use the `-dark` files; never `filter: invert()`. Detail:
`DESIGN.md` § Brand Identity and `.claude/rules/brand-assets.md`.

## Gaps to fix before a social retake

1. **The CRM capture config has no `feed`, `stories` or `reel` entries.** Add
   them to `claude-config/tools/capture/apps/tekguyz-crm.json` (see the
   realstone-field-ops config for the pattern, and `claude-config#46`). Today
   it makes desktop, phone and a video only.
2. **Check the config still matches the new shell.** It clicks "Try the demo"
   and waits 4 s. Confirm the route list (`/`, `/pipeline`, `/contacts`,
   `/reports`) and the hidden banner text ("Leave the demo") still hold.
3. **Look at every picture** before using it. A passing run is not a good picture.

## Steps

1. Redesign merged and deployed. Confirm the Vercel deploy.
2. Add social entries to the capture config (gap 1).
3. Run the capture command above. Say "use tools/capture to retake the
   pictures of tekguyz-crm" and Claude does this and checks each picture.
4. Open each picture. Look for the demo bar, dev badge, real data, cut-off text.
5. Copy every picture and video to Drive
   `tekguyz-drive:tekguyz-one/social/lead-pipeline-crm/`, one folder per kind
   (per `C:/Projects/tekguyz-one/growth/outreach/muse-work-pack/README.md`).
   The reel goes in `video/` with the other video files. Use `rclone copy`,
   never `sync`. Run each line with `--dry-run` first, read the list, then run
   it without.

   ```bash
   rclone copy C:/Projects/tekguyz-crm/showcase tekguyz-drive:tekguyz-one/social/lead-pipeline-crm/desktop --include "*-desktop-*.png" --dry-run
   rclone copy C:/Projects/tekguyz-crm/showcase tekguyz-drive:tekguyz-one/social/lead-pipeline-crm/phone --include "*-phone-*.png" --dry-run
   rclone copy C:/Projects/tekguyz-crm/showcase tekguyz-drive:tekguyz-one/social/lead-pipeline-crm/feed --include "*-feed-*.png" --dry-run
   rclone copy C:/Projects/tekguyz-crm/showcase tekguyz-drive:tekguyz-one/social/lead-pipeline-crm/stories --include "*-stories-*.png" --dry-run
   rclone copy C:/Projects/tekguyz-crm/showcase/video tekguyz-drive:tekguyz-one/social/lead-pipeline-crm/video --dry-run
   ```

   Then check the counts with
   `rclone lsf -R tekguyz-drive:tekguyz-one/social/lead-pipeline-crm/`.
6. Commit `showcase/`. README images point at `showcase/*.png`; check they
   still look right.
