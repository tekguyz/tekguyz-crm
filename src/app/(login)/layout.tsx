import type { ReactNode } from "react";

import { LoginEmailProvider } from "@/components/auth/LoginEmailProvider";

// The (login) route group's only layout job: keep the typed email alive across
// signIn's error redirect, which remounts the page beneath it. See
// src/components/auth/LoginEmailProvider.tsx for the measurement.
export default function LoginLayout({ children }: { children: ReactNode }) {
  return <LoginEmailProvider>{children}</LoginEmailProvider>;
}
