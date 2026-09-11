import { notFound } from "next/navigation";

import { BoardFrame } from "@/app/(dev)/shell/pipeline/preview/BoardFrame";
import { LineBoard } from "@/app/(dev)/shell/pipeline/line/LineCard";

export default function LineVariantPage() {
  // Repeated from ../../layout.tsx on purpose, and this is the check that
  // matters: a layout that throws does NOT stop its page rendering, so with
  // the gate only in the layout `next build` would still prerender the comp
  // into the 404 response. See that file's comment for the measurement.
  if (process.env.NODE_ENV !== "development") notFound();

  return (
    <BoardFrame
      variant="Variant Line"
      href="/shell/pipeline/line"
      thesis="One field per line, tight leading. Nothing competes for width; a missing company or assignee drops its row."
    >
      <LineBoard />
    </BoardFrame>
  );
}
