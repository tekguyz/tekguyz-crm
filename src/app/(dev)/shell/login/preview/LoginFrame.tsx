import Link from "next/link";
import type { ReactNode } from "react";

// Page chrome for one full-size login variant: back link, name, thesis, and
// one link per fixture state. A banner above the surface rather than inside
// it, same reasoning as /shell/settings' SettingsFrame — the question here is
// layout and placement, and the banner costs every variant the same height.
const STATES = [
  { label: "Empty", query: "" },
  { label: "Wrong password", query: "?state=error" },
  { label: "Notice", query: "?state=message" },
  { label: "Longest values", query: "?long=1" },
];

export function LoginFrame({
  variant,
  thesis,
  href,
  children,
}: {
  variant: string;
  thesis: string;
  href: string;
  children: ReactNode;
}) {
  return (
    <main className="flex h-dvh flex-col bg-canvas-soft text-ink-main">
      <div className="shrink-0 border-b border-hairline bg-canvas-pure px-6 py-3">
        <Link href="/shell/login" className="text-body-sm text-accent underline underline-offset-2">
          ← All login variants
        </Link>
        <h1 className="text-h1 mt-1">{variant}</h1>
        <p className="text-body-sm max-w-[70ch] text-ink-muted">{thesis}</p>
        <p className="text-caption mt-1 flex flex-wrap items-center gap-x-2">
          {STATES.map((state, index) => (
            <span key={state.label} className="flex items-center gap-2">
              {index > 0 ? (
                <span aria-hidden="true" className="text-ink-muted">
                  ·
                </span>
              ) : null}
              <Link
                href={`${href}${state.query}`}
                className="text-accent underline underline-offset-2"
              >
                {state.label}
              </Link>
            </span>
          ))}
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
    </main>
  );
}
