import { useId } from "react";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils/cn";

// Design System v2: fields are Level 0 — hairline border, no shadow, 4px/8px
// padding. The focus treatment is a 1px accent ring drawn in globals.css, not
// an elevation shadow.
export function Input({
  label,
  hint,
  error,
  id,
  className,
  ...props
}: ComponentProps<"input"> & {
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
      <input
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? messageId : undefined}
        className={cn(
          "text-body-md w-full rounded-xs border bg-canvas-pure px-2 py-1 text-ink-main placeholder:text-ink-muted",
          "disabled:cursor-not-allowed disabled:opacity-50",
          error ? "border-danger" : "border-hairline",
          className,
        )}
        {...props}
      />
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
