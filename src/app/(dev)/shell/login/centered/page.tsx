import { notFound } from "next/navigation";

import { CenteredLogin } from "@/app/(dev)/shell/login/centered/CenteredLogin";
import { LoginFrame } from "@/app/(dev)/shell/login/preview/LoginFrame";
import type { LoginSearchParams } from "@/app/(dev)/shell/login/preview/mock-login";
import { resolveLoginFixture } from "@/app/(dev)/shell/login/preview/resolve-login";

export default async function CenteredLoginPage({
  searchParams,
}: {
  searchParams: Promise<LoginSearchParams>;
}) {
  // Repeated from ../../layout.tsx on purpose, and this is the check that
  // matters. A layout that throws does NOT stop its page rendering, so with
  // the gate only in the layout `next build` still prerenders the comp.
  if (process.env.NODE_ENV !== "development") notFound();

  const fixture = resolveLoginFixture(await searchParams);

  return (
    <LoginFrame
      variant="Variant Centered — the shipped page, tightened"
      thesis="Mark above one centred card, as today. Fields gain visible labels, and the demo becomes a full-width secondary button under an “or” rule."
      href="/shell/login/centered"
    >
      <CenteredLogin fixture={fixture} />
    </LoginFrame>
  );
}
