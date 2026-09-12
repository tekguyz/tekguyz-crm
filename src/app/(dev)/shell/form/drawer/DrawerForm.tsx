import { IconX } from "@tabler/icons-react";

import { Button } from "@/components/ui/Button";
import { FormBody, type FormMode } from "@/app/(dev)/shell/form/preview/FormBody";
import { FormBackdrop } from "@/app/(dev)/shell/form/preview/FormSurface";
import type { LeadFormValues } from "@/app/(dev)/shell/form/preview/mock-form";

// VARIANT DRAWER — the form arrives from the right, in the same slot the
// picked detail panel already owns. PICKED 2026-09-12.
//
// The pick was "everything in the drawer": reading a lead and editing one
// share a single address on screen. The alternative on the table was a wide
// full-page read view (the 4-column reference layout) with editing still in a
// drawer, and it was declined — it would reopen the detail-panel pick from
// 2026-09-09 and split one lead across two places. See /shell/form/full for
// the real eighteen-field form in this container.
//
// Its bet is consistency of place. Stage 1 picked Variant A — Jump strip for
// the lead detail panel, which is a right-hand drawer with a hairline header
// above a scrolling body. If editing a lead opens in the same slot with the
// same chrome, then "everything about one lead" has one address on screen and
// the app has one fewer shape to learn.
//
// WIDENED 2026-09-12, ON REVIEW FEEDBACK, AND THE NUMBER IS THE POINT.
// The first draft of this variant was `max-w-md` — 447px measured — which is
// the SAME width as the shipped Modal primitive (`max-w-md`, 448px) that the
// review named as too narrow. A drawer that reproduces the complaint is not a
// candidate, it is the status quo in a different place. The ramp is now
// w-full → sm:max-w-lg → lg:max-w-2xl: full width on a phone, 512px from the
// `sm` breakpoint, 672px from `lg`. That is Variant Inline's width in the
// drawer's slot.
//
// THIS FORCES A STAGE 2 DECISION, and it should not be discovered later: the
// shipped ProfileSheet is `max-w-md sm:max-w-lg` (512px at its widest). If the
// form drawer stops at 672px and the detail drawer stops at 512px, they are no
// longer one slot, and the consistency this variant is chosen FOR is gone.
// Stage 2 has to widen both onto the same ramp or neither.
//
// Its remaining cost is that it leaves a strip of the list visible on the
// left, which is either useful context or a distraction depending on the task.
//
// The header repeats the detail panel's structure — hairline bottom border,
// px-4 py-3, title truncating against a shrink-0 close button — rather than
// inventing a second drawer header. Its quick-action row is NOT copied: this
// is a form, and four protocol links beside the fields would compete with the
// submit button for the same attention.
export function DrawerForm({ mode, initial }: { mode: FormMode; initial: LeadFormValues }) {
  const title = mode === "create" ? "New lead" : initial.client_name;

  return (
    <div className="relative h-full overflow-hidden bg-canvas-soft">
      <div className="h-full overflow-hidden">
        <FormBackdrop />
      </div>

      <div aria-hidden className="absolute inset-0 bg-ink-main/40" />

      <section
        aria-label={`${title} form drawer`}
        className="absolute inset-y-0 right-0 flex w-full flex-col border-l border-hairline bg-canvas-pure shadow-elevation-2 sm:max-w-lg lg:max-w-2xl"
      >
        <div className="flex shrink-0 items-center gap-3 border-b border-hairline px-4 py-3">
          <h2 className="text-title min-w-0 flex-1 truncate">{title}</h2>
          <Button type="button" variant="ghost" size="sm" aria-label="Close" className="size-7 shrink-0 px-0">
            <IconX stroke={1.75} aria-hidden className="size-4" />
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <FormBody mode={mode} initial={initial} />
        </div>
      </section>
    </div>
  );
}
