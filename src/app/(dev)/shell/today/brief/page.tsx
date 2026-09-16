import { notFound } from "next/navigation";

import { BriefToday } from "@/app/(dev)/shell/today/brief/BriefToday";
import { TodayFrame } from "@/app/(dev)/shell/today/preview/TodayFrame";
import { SCALES, resolveScale } from "@/app/(dev)/shell/today/preview/mock-today";

// `?scale=sparse` and `?scale=empty` are the other half of the viewport claim
// — see mock-today.ts. Default is demo scale.
export default async function BriefVariantPage({
  searchParams,
}: {
  searchParams: Promise<{ scale?: string }>;
}) {
  // Repeated from ../../layout.tsx on purpose — see that file, and the
  // sibling ledger/page.tsx, for why the layout's gate is not enough.
  if (process.env.NODE_ENV !== "development") notFound();

  const scale = resolveScale((await searchParams).scale);
  const { leads, tasks } = SCALES[scale];

  return (
    <TodayFrame
      variant={`Variant Brief${scale === "demo" ? "" : ` — ${scale}`}`}
      thesis="Three rows, money first: name and revenue on top, company and date below, stage pills on their own footer row."
    >
      <BriefToday leads={leads} tasks={tasks} />
    </TodayFrame>
  );
}
