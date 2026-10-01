import { notFound } from "next/navigation";

import { SplitLanding } from "@/app/(dev)/shell/landing/split/SplitLanding";

// Full size, no comp frame — see ../stacked/page.tsx.
export default function SplitLandingPage() {
  // Repeated from ../../layout.tsx on purpose — see that file.
  if (process.env.NODE_ENV !== "development") notFound();

  return <SplitLanding />;
}
