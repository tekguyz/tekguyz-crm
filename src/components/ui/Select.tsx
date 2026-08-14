import { IconChevronDown } from "@tabler/icons-react";
import { useId } from "react";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils/cn";

// Wraps a native <select> rather than a custom listbox: seven existing call
// sites already use native selects, native gives correct mobile and keyboard
// behaviour for free, and v2 has no visual requirement a native control cannot
// meet. appearance-none removes the platform arrow so the Tabler chevron can
// sit in its place.
export function Select({
  label,
  hint,
  error,
  id,
  className,
  children,
  ...props
}: ComponentProps<"select"> & {
  label?: string;
  hint?: string;
  error?: string;
}) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const messageId = `${fieldId}-message`;

  return (
    <div className="flex w-full flex-col gap-1">
      {label ? (
        <label htmlFor={fieldId} className="text-label text-ink-muted">
          {label}
        </label>
      ) : null}
      <div className="relative">
        <select
          id={fieldId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? messageId : undefined}
          className={cn(
            "text-body-md w-full appearance-none rounded-xs border bg-canvas-pure py-1 pr-7 pl-2 text-ink-main",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error ? "border-danger" : "border-hairline",
            className,
          )}
          {...props}
        >
          {children}
        </select>
        <IconChevronDown
          aria-hidden="true"
          stroke={1.75}
          className="pointer-events-none absolute top-1/2 right-2 size-3.5 -translate-y-1/2 text-ink-muted"
        />
      </div>
      {error || hint ? (
        <p
          id={messageId}
          className={cn(
            "text-caption",
            error ? "text-danger" : "text-ink-muted",
          )}
        >
          {error ?? hint}
        </p>
      ) : null}
    </div>
  );
}
