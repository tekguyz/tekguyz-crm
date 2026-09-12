import {
  MOCK_ORG,
  MOCK_ORG_LONG,
  type OrgProfileValues,
} from "@/app/(dev)/shell/settings/preview/mock-org";

export type SettingsSearchParams = { long?: string };

// One reading of the query string for all three variant pages, so the three
// cannot drift into answering `?long=1` differently — which would quietly make
// the width check mean three different things.
//
// Plain module, no directive. Both the server pages and the test import it.
export function resolveOrgFixture(params: SettingsSearchParams): OrgProfileValues {
  return params.long === "1" ? MOCK_ORG_LONG : MOCK_ORG;
}
