import { notFound } from "next/navigation";

import { InlineForm } from "@/app/(dev)/shell/form/inline/InlineForm";
import { FormFrame } from "@/app/(dev)/shell/form/preview/FormSurface";
import { resolveFormFixture, type FormSearchParams } from "@/app/(dev)/shell/form/preview/resolve-mode";

export default async function InlineFormPage({
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
      variant="Variant Inline — a place on the page"
      thesis="No overlay at all. The form is a page section above the list, and can use the full width."
      href="/shell/form/inline"
      mode={mode}
    >
      <InlineForm mode={mode} initial={initial} />
    </FormFrame>
  );
}
