import type { ComponentProps } from "react";

import { cn } from "@/lib/utils/cn";

// Level 0 surface: hairline border, no shadow, 16px padding (v1 used 24px).
//
// `cold` is the Going Cold SLA rule, carried over from v1 unchanged in
// behaviour and restyled in v2 tokens: when a lead's next_action_at is overdue
// its card border becomes a dashed --cold line and its status badge
// desaturates (see Badge's "cold" tone). The rule is a real business signal,
// not decoration — do not repurpose either for styling.
export function Card({
  cold = false,
  className,
  children,
  ...props
}: ComponentProps<"div"> & { cold?: boolean }) {
  return (
    <div
      data-cold={cold ? "true" : undefined}
      className={cn(
        "rounded-lg border bg-canvas-pure p-4 text-ink-main",
        cold ? "border-dashed border-cold" : "border-hairline",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
