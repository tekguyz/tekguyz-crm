import { notFound } from "next/navigation";

import { PanelFrame } from "@/app/(dev)/shell/detail/preview/PanelFrame";
import { SplitPanel } from "@/app/(dev)/shell/detail/split/SplitPanel";

export default function SplitVariantPage() {
  // See ../jump/page.tsx — the gate belongs in the page, not only the layout.
  if (process.env.NODE_ENV !== "development") notFound();

  return (
    <PanelFrame
      variant="Variant D — Split"
      // The one variant that changes the panel's width, which is why it is the
      // only PanelFrame call passing `width`.
      width="max-w-3xl"
      thesis="A wider panel: the brief and the note composer stand in a left column while the working sections tab beside them."
    >
      <SplitPanel />
    </PanelFrame>
  );
}
