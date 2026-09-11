import { notFound } from "next/navigation";

import { AccordionPanel } from "@/app/(dev)/shell/detail/accordion/AccordionPanel";
import { PanelFrame } from "@/app/(dev)/shell/detail/preview/PanelFrame";

export default function AccordionVariantPage() {
  // See ../jump/page.tsx — the gate belongs in the page, not only the layout.
  if (process.env.NODE_ENV !== "development") notFound();

  return (
    <PanelFrame
      variant="Variant C — Accordion"
      thesis="Every section is a collapsed row with a count, so the whole shape of the lead fits on one screen. Open as many as you want."
    >
      <AccordionPanel />
    </PanelFrame>
  );
}
