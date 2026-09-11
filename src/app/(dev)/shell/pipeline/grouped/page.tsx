import { notFound } from "next/navigation";

import { BoardFrame } from "@/app/(dev)/shell/pipeline/preview/BoardFrame";
import { GroupedBoard } from "@/app/(dev)/shell/pipeline/grouped/GroupedCard";

export default function GroupedVariantPage() {
  // Repeated from ../../layout.tsx on purpose, and this is the check that
  // matters: a layout that throws does NOT stop its page rendering, so with
  // the gate only in the layout `next build` would still prerender the comp
  // into the 404 response. See that file's comment for the measurement.
  if (process.env.NODE_ENV !== "development") notFound();

  return (
    <BoardFrame
      variant="Variant Grouped"
      href="/shell/pipeline/grouped"
      thesis="Two rows: name and revenue on top, one muted meta line below (company · date · assignee)."
    >
      <GroupedBoard />
    </BoardFrame>
  );
}
