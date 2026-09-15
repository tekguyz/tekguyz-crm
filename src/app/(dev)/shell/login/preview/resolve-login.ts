import {
  EMPTY_LOGIN,
  LOGIN_ERROR,
  LOGIN_MESSAGE,
  LONG_EMAIL,
  LONG_ERROR,
  type LoginFixture,
  type LoginSearchParams,
} from "@/app/(dev)/shell/login/preview/mock-login";

// One reading of the query string for all three variant pages, so the three
// cannot drift into answering `?state=` or `?long=1` differently — which would
// quietly make the width check mean three different things.
//
// `long=1` wins over `state`: it is the worst case the width check measures,
// so it always carries the long address AND the long error banner.
export function resolveLoginFixture(params: LoginSearchParams): LoginFixture {
  if (params.long === "1") return { email: LONG_EMAIL, error: LONG_ERROR, message: null };
  if (params.state === "error") return { email: "sam@tekguyz.com", error: LOGIN_ERROR, message: null };
  if (params.state === "message") return { ...EMPTY_LOGIN, message: LOGIN_MESSAGE };
  return EMPTY_LOGIN;
}
