import { notFound } from "next/navigation";

import { DrawerForm } from "@/app/(dev)/shell/form/drawer/DrawerForm";
import { FormFrame } from "@/app/(dev)/shell/form/preview/FormSurface";
import { resolveFormFixture, type FormSearchParams } from "@/app/(dev)/shell/form/preview/resolve-mode";

export default async function DrawerFormPage({
  searchParams,
}: {
  searchParams: Promise<FormSearchParams>;
}) {
  // Repeated from ../../layout.tsx on purpose, and this is the check that
  // matters. A layout that throws does NOT stop its page rendering — React
  // renders the two concurrently — so with the gate only in the layout,
  // `next build` still prerenders the whole comp into the 404 response.
  if (process.env.NODE_ENV !== "development") notFound();

  const { mode, initial } = resolveFormFixture(await searchParams);

  return (
    <FormFrame
      variant="Variant Drawer — the detail panel's slot"
      thesis="Slides in from the right with the same chrome as the picked lead detail panel, so one lead has one address on screen."
      href="/shell/form/drawer"
      mode={mode}
    >
      <DrawerForm mode={mode} initial={initial} />
    </FormFrame>
  );
}
