import type { ReactNode } from "react";
import { BrandMark } from "@/components/brand/BrandMark";

// Shared by login, signup, forgot-password, reset-password and onboarding, so
// the mark reaches all five signed-out screens from here.
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas-soft p-6">
      {/* Above the card, not inside it: these are the only screens a signed-out
          visitor sees, so the mark is doing identification work here rather
          than decorating a panel. */}
      <div className="mb-6 flex flex-col items-center gap-3">
        <BrandMark height={52} />
        <p className="text-sm font-semibold tracking-tight">TEKGUYZ CRM</p>
      </div>
      <div className="w-full max-w-sm rounded-lg border border-hairline bg-canvas-pure p-6 shadow-elevation-2">
        {children}
      </div>
    </div>
  );
}
