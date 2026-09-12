import { IconX } from "@tabler/icons-react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FormBody, type FormMode } from "@/app/(dev)/shell/form/preview/FormBody";
import { FormBackdrop } from "@/app/(dev)/shell/form/preview/FormSurface";
import type { LeadFormValues } from "@/app/(dev)/shell/form/preview/mock-form";

// VARIANT MODAL — the shipped shape, restyled. A centred card over a dimmed
// list, which is what CreateLeadDrawer and EditLeadDrawer both do today.
//
// Its bet is that creating or editing a lead is a short, total task: you do
// not need the list while you are doing it, so covering the list costs
// nothing and the centre of the screen is the easiest place to read a column
// of fields.
//
// Its cost is that it covers the list. An operator who wants to check the
// company name on the row below cannot, and on a laptop the card's own
// max-w-lg is narrower than the space available — the modal is the only one
// of the three that gets no wider on a big screen.
//
// NOT the Modal primitive, and that is deliberate for a comp. Modal renders a
// real <dialog>, which the browser promotes to the top layer — it would
// escape VariantThumb's transform on the index page and cover the whole
// screen instead of sitting inside its tile. detail/preview/PanelFrame.tsx
// made the same trade for the same reason. The primitive is what Stage 2
// wires; this is a picture of it.
export function ModalForm({ mode, initial }: { mode: FormMode; initial: LeadFormValues }) {
  const title = mode === "create" ? "New lead" : initial.client_name;

  return (
    <div className="relative h-full overflow-hidden bg-canvas-soft">
      <div className="h-full overflow-hidden">
        <FormBackdrop />
      </div>

      <div aria-hidden className="absolute inset-0 bg-ink-main/40" />

      <div className="absolute inset-0 flex items-start justify-center overflow-y-auto p-6">
        <Card className="w-full max-w-lg p-6 shadow-elevation-2">
          <div className="mb-4 flex items-start gap-3">
            {/* min-w-0 is not decoration: without it a long client name
                refuses to shrink and pushes the close button off the card.
                The check in scripts/check-comp-text-widths.mjs is what keeps
                the opposite mistake — a title squeezed to nothing — honest. */}
            <h2 className="text-h2 min-w-0 flex-1 truncate">{title}</h2>
            <Button type="button" variant="ghost" size="sm" aria-label="Close" className="size-7 shrink-0 px-0">
              <IconX stroke={1.75} aria-hidden className="size-4" />
            </Button>
          </div>

          <FormBody mode={mode} initial={initial} />
        </Card>
      </div>
    </div>
  );
}
