import { notFound } from "next/navigation";

import { SplitSettings } from "@/app/(dev)/shell/settings/split/SplitSettings";
import { SettingsFrame } from "@/app/(dev)/shell/settings/preview/SettingsFrame";
import { resolveOrgFixture, type SettingsSearchParams } from "@/app/(dev)/shell/settings/preview/resolve-org";

export default async function SplitSettingsPage({
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
      variant="Variant Split — explanation left, controls right"
      thesis="Each section says what it is beside its own controls instead of above them, with a full-bleed hairline between sections."
      href="/shell/settings/split"
    >
      <SplitSettings initial={initial} />
    </SettingsFrame>
  );
}
