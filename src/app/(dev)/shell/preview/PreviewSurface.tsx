"use client";

import Link from "next/link";
import type { MouseEvent, ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

// The frames every variant page is displayed inside. Three jobs:
//
// 1. STOP THE COMP NAVIGATING AWAY. Every nav row is a real <Link> to a real
//    route — that is the point, since the comps consume the shipped NavItem
//    primitive rather than a look-alike. Clicking one would leave the comp. A
//    single delegated handler on the frame cancels any click that landed on an
//    anchor, which also covers keyboard Enter (an activated link dispatches a
//    real click event). Nothing is done to the links themselves, so focus
//    rings, hover states and the accessibility tree are exactly what ships.
//
// 2. GIVE THE CHROME SOMETHING TO SIT IN. The desktop frame is a fixed-height
//    bordered box, not the viewport, so one page can show the expanded rail,
//    the collapsed rail and a phone side by side and be screenshotted once.
//
// 3. LET THE PHONE FRAME BE A PHONE. The shipped tab bar is `md:hidden`, and a
//    375px box inside a desktop page is still a desktop viewport — so the
//    frame passes `md:flex` to bring it back. That is a comp-only override
//    passed from here, never a change to the bar's own default classes.
//
// The sidebar comps render IN FLOW at w-60 / w-14 rather than reproducing the
// shipped two-layer translate mechanism. The collapse mechanism, the tg_sidebar
// cookie and <main> staying `relative` are all frozen by this prompt's scope
// fence; what is under review is what the rail CONTAINS, so each state is shown
// statically and the animation is left exactly where it lives today.

function cancelLinkNavigation(event: MouseEvent<HTMLDivElement>) {
  if ((event.target as HTMLElement).closest("a[href]")) event.preventDefault();
}

export function DesktopFrame({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <figure className="flex min-w-0 flex-col gap-2">
      <figcaption className="text-label text-ink-muted uppercase">{label}</figcaption>
      {/* Not a control: it cancels a descendant link's default so the comp
          stays put. It adds no behaviour of its own, is never focusable, and
          the links inside keep their own keyboard handling — an activated link
          dispatches a real click event, so Enter goes through this handler
          too. */}
      <div
        onClick={cancelLinkNavigation}
        className={cn(
          "flex h-[500px] overflow-hidden rounded-lg border border-hairline bg-canvas-soft",
          className,
        )}
      >
        {children}
      </div>
    </figure>
  );
}

export function PhoneFrame({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <figure className="flex shrink-0 flex-col gap-2">
      <figcaption className="text-label text-ink-muted uppercase">{label}</figcaption>
      {/* Same delegated cancel as DesktopFrame. */}
      <div
        onClick={cancelLinkNavigation}
        className="relative h-[500px] w-[375px] overflow-hidden rounded-lg border border-hairline bg-canvas-soft"
      >
        {children}
      </div>
    </figure>
  );
}

// PHONE_TAB_BAR_OVERRIDE deliberately does NOT live here — see ./frames.ts for
// why a "use client" module is the wrong home for a constant a Server
// Component reads.

export function VariantPage({
  name,
  thesis,
  children,
}: {
  name: string;
  thesis: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-dvh bg-canvas-soft p-6 text-ink-main">
      <header className="mb-6 flex flex-col gap-1">
        <Link href="/shell" className="text-body-sm w-fit text-accent underline underline-offset-2">
          ← All shell variants
        </Link>
        <h1 className="text-display">{name}</h1>
        <p className="text-body-md max-w-[70ch] text-ink-muted">{thesis}</p>
      </header>
      <div className="flex flex-col gap-8">{children}</div>
    </main>
  );
}
