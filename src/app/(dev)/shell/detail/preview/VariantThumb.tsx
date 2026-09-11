import Link from "next/link";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/Badge";

// A LIVE, SCALED PREVIEW OF ONE VARIANT — not a description of it.
//
// The first draft of the index page was four cards of prose explaining what
// each variant did. That is unusable for the job the page exists to do: you
// cannot choose between four layouts by reading four paragraphs, and the page
// looked like one blob of text because that is exactly what it was. The
// comparison has to be visual, so each tile renders the REAL component at its
// real width and scales it down.
//
// Scaled with a transform, never by shrinking the panel. A panel rendered at
// 340px would reflow into its own mobile layout and the tile would be showing
// something the variant never looks like at the width being judged. Rendering
// at the true width and applying `scale` keeps every proportion honest — the
// header height against the metadata strip, the tab strip against the body.
//
// pointer-events-none on the scaled layer: a 0.6-scale button is not a control
// anybody wants to hit, and the whole tile is a link to the full-size page.
export function VariantThumb({
  href,
  name,
  nav,
  frameWidth,
  picked = false,
  children,
}: {
  href: string;
  name: string;
  nav: string;
  // The width the variant is actually designed for. Split is a max-w-3xl
  // panel; the other three are max-w-lg. Passing it per variant is what keeps
  // the wide one from being silently previewed as if it were narrow.
  frameWidth: number;
  // Marks the variant the review chose, with the same neutral badge /shell
  // uses for Prompt 1's pick.
  picked?: boolean;
  children: ReactNode;
}) {
  const TILE_WIDTH = 340;
  const TILE_HEIGHT = 420;
  const scale = TILE_WIDTH / frameWidth;

  return (
    <div className="group flex w-[340px] flex-col gap-2">
      <div
        className="relative overflow-hidden rounded-lg border border-hairline bg-canvas-pure transition-colors group-hover:border-accent"
        style={{ height: TILE_HEIGHT }}
      >
        <div
          // `inert`, not just aria-hidden. Each preview is a real panel with
          // roughly fifteen focusable controls in it; aria-hidden would hide
          // them from a screen reader while leaving all sixty in the tab
          // order, so a keyboard user would tab through four dead panels
          // before reaching anything on this page. `inert` removes them from
          // both the a11y tree and the tab order, which is what a picture of a
          // UI should be.
          //
          // KNOWN AND ACCEPTED: rendering the same component four times also
          // duplicates its element ids (`brief`, `tab-tasks`, …) across the
          // page. Nothing breaks — every one of those references is inside an
          // inert subtree, so no aria-controls is ever resolved and no jump
          // target is ever used — and the alternative is threading an id
          // prefix through all four real variants to serve this index page,
          // which would complicate the thing being judged for the benefit of
          // the thing judging it.
          inert
          className="pointer-events-none absolute top-0 left-0 flex origin-top-left flex-col"
          style={{
            width: frameWidth,
            height: TILE_HEIGHT / scale,
            transform: `scale(${scale})`,
          }}
        >
          {children}
        </div>

        {/* THE LINK IS A SIBLING OF THE PREVIEW, NEVER ITS ANCESTOR.
            Wrapping the panel in the <Link> was the first attempt and it is
            invalid HTML: every variant's header carries tel:/sms:/mailto:
            anchors, so the tile became an <a> containing four more. React
            reported it as a hydration failure on the real page — the browser
            un-nests the inner anchors while parsing, so the server markup and
            the client tree stop matching and the whole page falls back to a
            client render. An overlay covering the tile gives the same
            click target with no nesting; the scaled layer is
            pointer-events-none, so nothing under it competes. */}
        <Link
          href={href}
          aria-label={`Open ${name} full size`}
          className="absolute inset-0 rounded-lg"
        />
      </div>

      <div>
        <div className="flex items-start justify-between gap-2">
          <Link href={href} className="text-h2 text-accent underline underline-offset-2">
            {name}
          </Link>
          {/* Neutral, not accent — same reasoning as /shell: the link beside it
              already spends --accent. */}
          {picked ? (
            <Badge tone="neutral" dot className="shrink-0 border border-hairline">
              Picked
            </Badge>
          ) : null}
        </div>
        <p className="text-label uppercase text-ink-muted">{nav}</p>
      </div>
    </div>
  );
}
