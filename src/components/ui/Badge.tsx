import type { ComponentProps } from "react";

import { cn } from "@/lib/utils/cn";

export type BadgeTone =
  | "neutral"
  | "purple"
  | "pink"
  | "orange"
  | "teal"
  | "green"
  | "sky"
  | "cold";

// The decorative pill palette is for status badges and category dots ONLY —
// never layout borders, never primary buttons. "cold" is not decorative: it is
// the desaturated half of the Going Cold SLA rule (see Card's `cold` prop).
const TONES: Record<BadgeTone, string> = {
  neutral: "bg-canvas-soft text-ink-muted",
  purple: "bg-pill-purple-bg text-pill-purple-fg",
  pink: "bg-pill-pink-bg text-pill-pink-fg",
  orange: "bg-pill-orange-bg text-pill-orange-fg",
  teal: "bg-pill-teal-bg text-pill-teal-fg",
  green: "bg-pill-green-bg text-pill-green-fg",
  sky: "bg-pill-sky-bg text-pill-sky-fg",
  cold: "bg-canvas-soft text-cold",
};

export function Badge({
  tone = "neutral",
  dot = false,
  className,
  children,
  ...props
}: ComponentProps<"span"> & { tone?: BadgeTone; dot?: boolean }) {
  return (
    <span
      className={cn(
        "text-label inline-flex items-center gap-1.5 rounded-sm px-1.5 py-0.5",
        TONES[tone],
        className,
      )}
      {...props}
    >
      {dot ? (
        <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      ) : null}
      {children}
    </span>
  );
}
