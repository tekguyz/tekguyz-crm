import Link from "next/link";
import type { ReactNode } from "react";

// Page chrome for one full-size Settings variant: back link, name, thesis, and
// the link to the longest-values fixture.
//
// Deliberately a BANNER above the surface rather than a fake sidebar and
// header. /shell/pipeline's BoardFrame had to reproduce the shipped shell's
// geometry because its measurement was "how many cards fit", and a banner
// would have stolen height the real page never loses. This prompt's Settings
// measurement is about WIDTH — how wide each section's controls end up, and
// whether anything collapses — so the vertical budget is not what is being
// judged and a banner costs the comparison nothing.
export function SettingsFrame({
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
        <Link
          href="/shell/settings"
          className="text-body-sm text-accent underline underline-offset-2"
        >
          ← All Settings variants
        </Link>
        <h1 className="text-h1 mt-1">{variant}</h1>
        <p className="text-body-sm max-w-[70ch] text-ink-muted">{thesis}</p>
        <p className="text-caption mt-1 flex items-center gap-2">
          <Link href={href} className="text-accent underline underline-offset-2">
            Ordinary values
          </Link>
          <span aria-hidden="true" className="text-ink-muted">
            ·
          </span>
          <Link href={`${href}?long=1`} className="text-accent underline underline-offset-2">
            Longest values
          </Link>
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
    </main>
  );
}
