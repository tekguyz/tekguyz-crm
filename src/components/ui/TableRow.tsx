import type { ComponentProps } from "react";

import { cn } from "@/lib/utils/cn";

// Bare structural shell only. No sorting, selection, resizing or data prop —
// nothing consumes this yet, and DESIGN.md v2 explicitly puts Table View out of
// scope. Build those with the feature, not ahead of it.
//
// The horizontal scroll wrapper is here rather than at call sites so a wide
// table can never make the page body scroll sideways.
export function Table({ className, ...props }: ComponentProps<"table">) {
  return (
    <div className="w-full overflow-x-auto">
      <table
        className={cn("text-body-sm w-full border-collapse", className)}
        {...props}
      />
    </div>
  );
}

export function TableHead({ className, ...props }: ComponentProps<"thead">) {
  return (
    <thead className={cn("text-label text-ink-muted", className)} {...props} />
  );
}

export function TableBody({ className, ...props }: ComponentProps<"tbody">) {
  return <tbody className={className} {...props} />;
}

// `cold` mirrors Card's Going Cold SLA treatment, so an overdue lead reads the
// same in a row as it does on a card.
export function TableRow({
  cold = false,
  className,
  ...props
}: ComponentProps<"tr"> & { cold?: boolean }) {
  return (
    <tr
      data-cold={cold ? "true" : undefined}
      className={cn(
        "border-b",
        cold ? "border-dashed border-cold" : "border-hairline",
        className,
      )}
      {...props}
    />
  );
}

export function TableHeaderCell({ className, ...props }: ComponentProps<"th">) {
  return (
    <th className={cn("px-3 py-2 text-left font-medium", className)} {...props} />
  );
}

export function TableCell({ className, ...props }: ComponentProps<"td">) {
  return <td className={cn("px-3 py-2 text-ink-main", className)} {...props} />;
}
