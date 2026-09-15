import { notFound } from "next/navigation";

import { MastheadLogin } from "@/app/(dev)/shell/login/masthead/MastheadLogin";
import { LoginFrame } from "@/app/(dev)/shell/login/preview/LoginFrame";
import type { LoginSearchParams } from "@/app/(dev)/shell/login/preview/mock-login";
import { resolveLoginFixture } from "@/app/(dev)/shell/login/preview/resolve-login";

export default async function MastheadLoginPage({
  searchParams,
}: {
  searchParams: Promise<LoginSearchParams>;
}) {
  // Repeated from ../../layout.tsx on purpose — see centered/page.tsx.
  if (process.env.NODE_ENV !== "development") notFound();

  const fixture = resolveLoginFixture(await searchParams);

  return (
    <LoginFrame
      variant="Variant Masthead — it already looks like the app"
      thesis="A 48px top bar with the mark left and the demo right, no card, the form in a narrow column on the canvas, and a footer that explains the missing sign-up."
      href="/shell/login/masthead"
    >
      <MastheadLogin fixture={fixture} />
    </LoginFrame>
  );
}
