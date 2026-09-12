import { notFound } from "next/navigation";

import { StackedSettings } from "@/app/(dev)/shell/settings/stacked/StackedSettings";
import { SettingsFrame } from "@/app/(dev)/shell/settings/preview/SettingsFrame";
import { resolveOrgFixture, type SettingsSearchParams } from "@/app/(dev)/shell/settings/preview/resolve-org";

export default async function StackedSettingsPage({
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
      variant="Variant Stacked — one column, nothing hidden"
      thesis="A card per section down one column, the shape shipped today. No navigation, because with three sections there is nothing to navigate."
      href="/shell/settings/stacked"
    >
      <StackedSettings initial={initial} />
    </SettingsFrame>
  );
}
