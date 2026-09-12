import { Card } from "@/components/ui/Card";
import { FormBody, type FormMode } from "@/app/(dev)/shell/form/preview/FormBody";
import { FormBackdrop } from "@/app/(dev)/shell/form/preview/FormSurface";
import type { LeadFormValues } from "@/app/(dev)/shell/form/preview/mock-form";

// VARIANT INLINE — the form is a place on the page, not something on top of
// the page. No overlay, no dim, nothing covered.
//
// Its bet is that a lead form is not a dialog-shaped task. Nothing is blocked
// while it is open, the list stays readable underneath, and the form can use
// the full page width — so the six fields can sit two-up instead of stacked,
// which is the only one of the three variants that fits them all above the
// fold on a laptop.
//
// Its cost is that nothing says "you are in the middle of something". There
// is no backdrop to click away, no obvious modal discipline, and on the real
// /contacts page it would push the list down every time it opened. It also
// has no answer yet for where it goes on a phone, where a full-width section
// and a full-screen sheet look the same.
//
// The section is capped at max-w-2xl rather than running edge to edge: a
// label/field pair stretched across 1400px is a measurably worse form, and
// the cap is what lets the two-up row exist at all without the two halves
// drifting apart.
export function InlineForm({ mode, initial }: { mode: FormMode; initial: LeadFormValues }) {
  const title = mode === "create" ? "New lead" : initial.client_name;

  return (
    <div className="relative h-full overflow-y-auto bg-canvas-soft">
      <div className="p-6">
        <Card className="w-full max-w-2xl p-6">
          <h2 className="text-h2 mb-4 truncate">{title}</h2>
          <FormBody mode={mode} initial={initial} />
        </Card>
      </div>

      {/* Fewer rows than the two overlay variants carry, because here the list
          is genuinely below the form rather than behind it — showing seven
          would make the page about the list instead of about the form. */}
      <FormBackdrop rows={4} />
    </div>
  );
}
