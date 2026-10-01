import { notFound } from "next/navigation";

import { StackedLanding } from "@/app/(dev)/shell/landing/stacked/StackedLanding";

// Full size, no comp frame: a Landing Page is judged as the whole screen a
// stranger sees, so nothing dev-only may sit on top of it.
export default function StackedLandingPage() {
  // Repeated from ../../layout.tsx on purpose — see that file.
  if (process.env.NODE_ENV !== "development") notFound();

  return <StackedLanding />;
}
