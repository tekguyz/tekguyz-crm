import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas-soft p-6">
      <div className="w-full max-w-sm rounded-lg border border-hairline bg-canvas-pure p-6 shadow-elevation-2">
        <p className="mb-6 text-sm font-semibold tracking-tight">TEKGUYZ CRM</p>
        {children}
      </div>
    </div>
  );
}
