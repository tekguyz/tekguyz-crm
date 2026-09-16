import { notFound } from "next/navigation";

import { LedgerToday } from "@/app/(dev)/shell/today/ledger/LedgerToday";
import { TodayFrame } from "@/app/(dev)/shell/today/preview/TodayFrame";
import { SCALES, resolveScale } from "@/app/(dev)/shell/today/preview/mock-today";

// `?scale=sparse` and `?scale=empty` are the other half of the viewport claim
// — see mock-today.ts. Default is demo scale.
export default async function LedgerVariantPage({
  searchParams,
}: {
  searchParams: Promise<{ scale?: string }>;
}) {
  // Repeated from ../../layout.tsx on purpose, and this is the check that
  // matters: a layout that throws does NOT stop its page rendering, so with
  // the gate only in the layout `next build` would still prerender the comp
  // into the 404 response. See that file's comment for the measurement.
  if (process.env.NODE_ENV !== "development") notFound();

  const scale = resolveScale((await searchParams).scale);
  const { leads, tasks } = SCALES[scale];

  return (
    <TodayFrame
      variant={`Variant Ledger${scale === "demo" ? "" : ` — ${scale}`}`}
      thesis="Two rows, identity first: name and stage pills on top, one muted meta line below (company · revenue · date)."
    >
      <LedgerToday leads={leads} tasks={tasks} />
    </TodayFrame>
  );
}
