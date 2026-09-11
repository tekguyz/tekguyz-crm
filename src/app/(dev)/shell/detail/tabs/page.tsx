import { notFound } from "next/navigation";

import { PanelFrame } from "@/app/(dev)/shell/detail/preview/PanelFrame";
import { TabsPanel } from "@/app/(dev)/shell/detail/tabs/TabsPanel";

export default function TabsVariantPage() {
  // See ../jump/page.tsx — the gate belongs in the page, not only the layout.
  if (process.env.NODE_ENV !== "development") notFound();

  return (
    <PanelFrame
      variant="Variant B — Tabs"
      thesis="One section on screen at a time. The long scroll stops existing, and so does seeing two sections together."
    >
      <TabsPanel />
    </PanelFrame>
  );
}
