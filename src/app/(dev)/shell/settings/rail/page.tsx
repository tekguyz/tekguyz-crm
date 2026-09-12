import { notFound } from "next/navigation";

import { RailSettings } from "@/app/(dev)/shell/settings/rail/RailSettings";
import { SettingsFrame } from "@/app/(dev)/shell/settings/preview/SettingsFrame";
import { resolveOrgFixture, type SettingsSearchParams } from "@/app/(dev)/shell/settings/preview/resolve-org";

export default async function RailSettingsPage({
  searchParams,
}: {
  searchParams: Promise<SettingsSearchParams>;
}) {
  // Repeated from ../../layout.tsx on purpose, and this is the check that
  // matters. A layout that throws does NOT stop its page rendering — React
  // renders the two concurrently — so with the gate only in the layout,
  // `next build` still prerenders the whole comp into the 404 response.
  if (process.env.NODE_ENV !== "development") notFound();

  const initial = resolveOrgFixture(await searchParams);

  return (
    <SettingsFrame
      variant="Variant Rail — a section rail, one pane at a time"
      thesis="A named rail on the left swaps the pane on the right. The layout that still works at eight sections, at the cost of hiding two of three today."
      href="/shell/settings/rail"
    >
      <RailSettings initial={initial} />
    </SettingsFrame>
  );
}
