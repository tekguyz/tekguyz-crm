import Link from "next/link";
import { notFound } from "next/navigation";

import { VariantThumb } from "@/app/(dev)/shell/detail/preview/VariantThumb";
import { DrawerForm } from "@/app/(dev)/shell/form/drawer/DrawerForm";
import { InlineForm } from "@/app/(dev)/shell/form/inline/InlineForm";
import { ModalForm } from "@/app/(dev)/shell/form/modal/ModalForm";
import { MOCK_LEAD_FORM } from "@/app/(dev)/shell/form/preview/mock-form";

// Index for the lead/contact form — Shell/IA Stage 1, prompt 4 of 4.
// Dev-only; see ../layout.tsx for all three gates and why the check is
// repeated in every page here.
//
// SHOWS, DOES NOT DESCRIBE — the rule /shell/detail learned the hard way and
// /shell/pipeline inherited. Each tile is the real variant rendered at a real
// page width and scaled down by the same VariantThumb, imported rather than
// copied. That component gained two optional size props for this page,
// because these surfaces are landscape pages rather than portrait panels; the
// detail and pipeline indexes pass neither and are unchanged.
//
// ONE FORM, THREE CONTAINERS. The axis under test is WHERE THE FORM LIVES.
// The fields, their order, their labels, their controlled-state wiring and
// their submit row come from one shared preview/FormBody.tsx and are
// byte-identical in all three — so a difference you can see is a difference
// in the container and never a typo in one variant.
//
// EDIT IS CREATE WITH VALUES IN IT. There is no second component and no
// second layout for editing; `initial` is the whole difference. Each variant
// page carries links to both modes and to the longest-values fixture.
//
// SIX FIELDS, NOT THE REAL FORM's EIGHT-PLUS. The field set is prompt 3's
// trimmed set, reused so that the card comps and the form comps describe the
// same lead. Stage 2 owes its own Form/Action field-parity diff against the
// real createLead / updateLead — see preview/mock-form.ts.
// MEASURED, NOT ESTIMATED. Headless Chrome, viewport exactly 1440x800, over
// the ?long=1 fixture as well as the ordinary one — the two agree to the pixel
// on every number below, because none of these containers reflows on content.
// Taken with the same CDP harness scripts/check-comp-text-widths.mjs uses.
//
// RE-MEASURED 2026-09-12 after the review widened Drawer. On a phone (390x844)
// the three come out 342 / 390 / 327px of container: the drawer is the widest
// there too, because it goes full width and the other two keep page padding.
//
// SIX FIELDS IS NOT THE REAL FORM, AND THAT MATTERS MORE AFTER THE REVIEW THAN
// BEFORE IT. The review's complaint about the shipped form is "too narrow, and
// I always have to scroll". The narrow half is real and measurable here — the
// shipped Modal primitive is `max-w-md`, 448px. The scrolling half is NOT
// visible in these comps at all: the real create form posts 8 fields and the
// real edit form carries 18 across its five groups, against this fixture's 6.
// Every variant below "fits without scrolling" on a field set a third the size
// of the real one. Judge the containers here; do not read these as proof the
// scrolling is solved.
const MEASUREMENTS = [
  {
    name: "Modal",
    width: "512px card · 462px form",
    fits: "all 6 fields and the submit row, ending 536px down an 800px window",
    cost: "Covers the list outright, and is now the NARROWEST of the three on a desktop — 512px fixed, which is the width the review called too small.",
  },
  {
    name: "Drawer",
    width: "672px panel · 639px form (512px at sm, full width on a phone)",
    fits: "all 6 fields and the submit row, ending 512px down",
    cost: "Its width ramp now stops at 672px while the shipped ProfileSheet stops at 512px — Stage 2 has to widen both or neither, or they stop being one slot.",
  },
  {
    name: "Inline",
    width: "672px card · 622px form",
    fits: "all 6 fields and the submit row, ending 511px down",
    cost: "Nothing says you are in the middle of something — no backdrop, no dismiss, and no answer yet for a phone.",
  },
];

// A laptop content area rather than a whole 1440px window: the tiles are
// pictures of the surface the form sits on, and the shipped shell spends 240px
// of sidebar before the page starts.
const FRAME_WIDTH = 1160;
const TILE_WIDTH = 440;
const TILE_HEIGHT = 300;

export default function LeadFormVariantsIndex() {
  if (process.env.NODE_ENV !== "development") notFound();

  const thumb = { frameWidth: FRAME_WIDTH, tileWidth: TILE_WIDTH, tileHeight: TILE_HEIGHT };

  return (
    <main className="min-h-dvh bg-canvas-soft p-6 text-ink-main">
      <header className="mb-6">
        <Link href="/shell" className="text-body-sm text-accent underline underline-offset-2">
          ← Shell / IA Stage 1
        </Link>
        <h1 className="text-display mt-1">Lead / contact form — Stage 1 comps</h1>
        <p className="text-body-md mt-1 max-w-[70ch] text-ink-muted">
          Three containers for one form. Same six fields, same order, same
          labels, same submit row in all three — only where the form lives
          changes. Click a tile to open it full size, where each variant also
          links to its empty Create state and to the longest-values fixture.
        </p>
        <p className="text-caption mt-2 max-w-[70ch] text-ink-muted">
          <strong className="text-ink-main">Picked on 2026-09-12: Variant Drawer.</strong>{" "}
          Everything about one lead lives in the drawer — the picked detail
          panel already owns that slot, so reading a lead and editing it share
          one address on screen. The read view stays a drawer too; the wide
          full-page detail layout was considered and declined for that reason.
          Modal and Inline are kept as the record of what Drawer was chosen
          over; they are not maintained past this date. Nothing here is wired to
          a Server Action, a query or the real form — that is Stage 2.
        </p>
        <p className="text-caption mt-2 max-w-[70ch] text-ink-muted">
          The pick carries one obligation into Stage 2: the shipped{" "}
          <code className="text-caption">ProfileSheet</code> stops at 512px and
          this drawer ramps to 672px. Widen both or neither, or they stop being
          one slot and the consistency the drawer was chosen for is gone.
        </p>
      </header>

      {/* Added 2026-09-12, above the three container tiles rather than beside
          them, because it is not a fourth answer to the same question. The
          three below compare CONTAINERS over one small field set; this one
          takes the picked container and puts the REAL eighteen-field form in
          it, which is the only way to see the scrolling the review is actually
          complaining about. */}
      <p className="text-body-md mb-6">
        <Link
          href="/shell/form/full"
          className="text-accent underline underline-offset-2"
        >
          Drawer at real scale — all 18 fields, grouped, two-up, width switchable →
        </Link>
      </p>

      <div className="flex flex-wrap gap-5">
        <VariantThumb
          href="/shell/form/modal"
          name="Variant Modal"
          nav="Centred over the list"
          {...thumb}
        >
          <ModalForm mode="edit" initial={MOCK_LEAD_FORM} />
        </VariantThumb>

        <VariantThumb
          href="/shell/form/drawer"
          name="Variant Drawer"
          nav="The detail panel's slot"
          picked
          {...thumb}
        >
          <DrawerForm mode="edit" initial={MOCK_LEAD_FORM} />
        </VariantThumb>

        <VariantThumb
          href="/shell/form/inline"
          name="Variant Inline"
          nav="A page section, no overlay"
          {...thumb}
        >
          <InlineForm mode="edit" initial={MOCK_LEAD_FORM} />
        </VariantThumb>
      </div>

      {/* Numbers stay in words below the pictures — /shell/detail's rule, kept
          by /shell/pipeline: "how wide" and "how many fit" are judged better as
          a number than by eye. */}
      <section className="mt-8 max-w-[80ch]">
        <h2 className="text-h2">Measured at 1440×800</h2>
        <p className="text-body-sm mt-1 text-ink-muted">
          Six fields is not the real form&apos;s field set — it is prompt 3&apos;s
          trimmed set, reused so the card comps and these describe the same
          lead. The real create form posts 8 and the real edit form carries 18,
          so &ldquo;fits without scrolling&rdquo; here is measured on a third of
          the real load and does not prove the scrolling is solved. None of the
          three numbers changes on the longest-values fixture; no container
          here reflows on content.
        </p>
        <dl className="mt-2 flex flex-col">
          {MEASUREMENTS.map((entry) => (
            <div key={entry.name} className="border-b border-hairline py-2 last:border-b-0">
              <dt className="text-title">
                {entry.name} — {entry.width} · fits {entry.fits}
              </dt>
              <dd className="text-body-sm text-ink-muted">{entry.cost}</dd>
            </div>
          ))}
        </dl>
      </section>

      <p className="text-caption mt-6 max-w-[70ch] text-ink-muted">
        Static fixture data. No Server Action, no Supabase query, no migration,
        no RLS. The shipped CreateLeadModal, EditLeadModal and the five
        edit-modal field groups are untouched.
      </p>
    </main>
  );
}
