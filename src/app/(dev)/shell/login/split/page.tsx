import { notFound } from "next/navigation";

import { LoginFrame } from "@/app/(dev)/shell/login/preview/LoginFrame";
import type { LoginSearchParams } from "@/app/(dev)/shell/login/preview/mock-login";
import { resolveLoginFixture } from "@/app/(dev)/shell/login/preview/resolve-login";
import { SplitLogin } from "@/app/(dev)/shell/login/split/SplitLogin";

export default async function SplitLoginPage({
  searchParams,
}: {
  searchParams: Promise<LoginSearchParams>;
}) {
  // Repeated from ../../layout.tsx on purpose — see centered/page.tsx.
  if (process.env.NODE_ENV !== "development") notFound();

  const fixture = resolveLoginFixture(await searchParams);

  return (
    <LoginFrame
      variant="Variant Split — say what it is, then sign in"
      thesis="A brand pane with the tagline, the description and an explained demo block beside a form that stands alone. Stacks below md, form first."
      href="/shell/login/split"
    >
      <SplitLogin fixture={fixture} />
    </LoginFrame>
  );
}
