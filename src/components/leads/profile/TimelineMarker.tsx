import type { Icon } from "@tabler/icons-react";

import { cn } from "@/lib/utils/cn";

// The type of one timeline entry, drawn on the rail: a tinted disc with a
// Tabler icon in the matching ink. It replaced a bare 8px grey dot, which said
// nothing about WHAT happened. Literal class names so Tailwind sees them.
//
// The tones are the decorative pill palette, which PRODUCT.md allows for
// category marks and status badges. Never --accent: that is for CTAs, active
// nav, focus and links.
const TONES = {
  purple: "bg-pill-purple-bg text-pill-purple-fg",
  pink: "bg-pill-pink-bg text-pill-pink-fg",
  orange: "bg-pill-orange-bg text-pill-orange-fg",
  teal: "bg-pill-teal-bg text-pill-teal-fg",
  green: "bg-pill-green-bg text-pill-green-fg",
  sky: "bg-pill-sky-bg text-pill-sky-fg",
} as const;

export type MarkerTone = keyof typeof TONES;

// Decorative: every entry already prints its type as a word in its caption, so
// the icon is aria-hidden and adds no second announcement.
//
// The ring is canvas-pure, so the disc looks cut out of the rail line behind
// it. `left` centres a 20px disc on the 1px rail drawn by the list's border
// plus 16px of padding.
export function TimelineMarker({
  icon: MarkerIcon,
  tone,
  pulse = false,
}: {
  icon: Icon;
  tone: MarkerTone;
  pulse?: boolean;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "absolute top-0 -left-[26.5px] flex size-5 items-center justify-center rounded-full ring-2 ring-canvas-pure",
        TONES[tone],
        pulse && "animate-pulse",
      )}
    >
      <MarkerIcon stroke={1.75} className="size-3" />
    </span>
  );
}
