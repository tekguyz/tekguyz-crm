import {
  EMPTY_LEAD_FORM,
  MOCK_LEAD_FORM,
  MOCK_LEAD_FORM_LONG,
  type LeadFormValues,
} from "@/app/(dev)/shell/form/preview/mock-form";

export type FormSearchParams = { mode?: string; long?: string };

// One reading of the query string for all three variant pages, so the three
// cannot drift into answering `?long=1` differently — which would quietly
// make the width check mean three different things.
//
// `edit` is the default because it is the case with values in it: an empty
// form tells you nothing about how a container copes with content, and the
// width check has nothing to measure.
//
// Plain module, no directive. Both the server pages and the test import it.
export function resolveFormFixture(params: FormSearchParams): {
  mode: "create" | "edit";
  initial: LeadFormValues;
} {
  if (params.long === "1") return { mode: "edit", initial: MOCK_LEAD_FORM_LONG };
  if (params.mode === "create") return { mode: "create", initial: EMPTY_LEAD_FORM };
  return { mode: "edit", initial: MOCK_LEAD_FORM };
}
