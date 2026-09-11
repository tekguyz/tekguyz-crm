import { notFound } from "next/navigation";

import { PanelFrame } from "@/app/(dev)/shell/detail/preview/PanelFrame";
import { JumpPanel } from "@/app/(dev)/shell/detail/jump/JumpPanel";

export default function JumpVariantPage() {
  // Repeated from ../../layout.tsx on purpose, and this is the check that
  // matters. A layout that throws does NOT stop its page rendering — React
  // renders the two concurrently — so with the gate only in the layout,
  // `next build` still prerenders the whole comp into the 404 response. See
  // that file's comment for the measurement.
  if (process.env.NODE_ENV !== "development") notFound();

  return (
    <PanelFrame
      variant="Variant A — Jump strip"
      thesis="One continuous scroll, plus a sticky strip of jump targets that tracks where you are. Nothing is ever hidden."
    >
      <JumpPanel />
    </PanelFrame>
  );
}
