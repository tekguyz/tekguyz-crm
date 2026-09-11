import { notFound } from "next/navigation";

import { BoardFrame } from "@/app/(dev)/shell/pipeline/preview/BoardFrame";
import { SplitBoard } from "@/app/(dev)/shell/pipeline/split/SplitCard";

export default function SplitVariantPage() {
  // Repeated from ../../layout.tsx on purpose, and this is the check that
  // matters: a layout that throws does NOT stop its page rendering, so with
  // the gate only in the layout `next build` would still prerender the comp
  // into the 404 response. See that file's comment for the measurement.
  if (process.env.NODE_ENV !== "development") notFound();

  return (
    <BoardFrame
      variant="Variant Split"
      href="/shell/pipeline/split"
      thesis="Identity on the left, numbers on the right. Revenue and dates line up down the column like a ledger."
    >
      <SplitBoard />
    </BoardFrame>
  );
}
