import { notFound } from "next/navigation";

import { ModalForm } from "@/app/(dev)/shell/form/modal/ModalForm";
import { FormFrame } from "@/app/(dev)/shell/form/preview/FormSurface";
import { resolveFormFixture, type FormSearchParams } from "@/app/(dev)/shell/form/preview/resolve-mode";

export default async function ModalFormPage({
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
      variant="Variant Modal — centred over the list"
      thesis="A centred card over a dimmed list — the shape shipped today. Nothing else is reachable while it is open."
      href="/shell/form/modal"
      mode={mode}
    >
      <ModalForm mode={mode} initial={initial} />
    </FormFrame>
  );
}
