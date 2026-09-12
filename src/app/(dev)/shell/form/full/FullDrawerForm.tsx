import { IconX } from "@tabler/icons-react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";
import { FullFormBody } from "@/app/(dev)/shell/form/preview/FullFormBody";
import { FormBackdrop } from "@/app/(dev)/shell/form/preview/FormSurface";
import type { FullLeadFormValues } from "@/app/(dev)/shell/form/preview/mock-form-full";

// THE PICKED CONTAINER, HOLDING THE REAL LOAD. Variant Drawer with all
// eighteen edit fields instead of the six-field comparison fixture.
//
// It is on its own route rather than replacing /shell/form/drawer because the
// three container comps have to keep the SAME field set to stay comparable —
// swapping one of them to eighteen fields would make the comparison meaningless
// and there would be no way to tell a container difference from a content
// difference. This route answers a different question and says so.
//
// WIDTH IS A QUERY PARAMETER HERE, not a decision baked into the file. The
// review's two complaints are "too narrow" and "always scrolling", and those
// are the same complaint measured on two axes — so the width has to be
// something you can move and watch. `?width=md` is the shipped Modal's own
// 448px, which is the baseline being argued against.
export const DRAWER_WIDTHS = {
  md: { className: "sm:max-w-md", px: 448, note: "the shipped Modal's width" },
  lg: { className: "sm:max-w-lg", px: 512, note: "the shipped ProfileSheet's width" },
  "2xl": { className: "sm:max-w-lg lg:max-w-2xl", px: 672, note: "Variant Drawer as widened" },
  "3xl": { className: "sm:max-w-lg lg:max-w-3xl", px: 768, note: "wider still" },
} as const;

export type DrawerWidth = keyof typeof DRAWER_WIDTHS;

export function FullDrawerForm({
  initial,
  width = "2xl",
}: {
  initial: FullLeadFormValues;
  width?: DrawerWidth;
}) {
  return (
    <div className="relative h-full overflow-hidden bg-canvas-soft">
      <div className="h-full overflow-hidden">
        <FormBackdrop />
      </div>

      <div aria-hidden className="absolute inset-0 bg-ink-main/40" />

      <section
        aria-label={`${initial.client_name} form drawer`}
        className={cn(
          "absolute inset-y-0 right-0 flex w-full flex-col border-l border-hairline bg-canvas-pure shadow-elevation-2",
          DRAWER_WIDTHS[width].className,
        )}
      >
        {/* Sticky header, matching the picked detail panel's chrome: hairline
            bottom border, px-4 py-3, a truncating title against a shrink-0
            close button. The body scrolls under it. */}
        <div className="flex shrink-0 items-center gap-3 border-b border-hairline px-4 py-3">
          <h2 className="text-title min-w-0 flex-1 truncate">{initial.client_name}</h2>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label="Close"
            className="size-7 shrink-0 px-0"
          >
            <IconX stroke={1.75} aria-hidden className="size-4" />
          </Button>
        </div>

        <FullFormBody initial={initial} />
      </section>
    </div>
  );
}
