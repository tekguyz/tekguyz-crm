import { useId } from "react";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils/cn";

// Same contract as Input (label / hint / error, generated id, aria wiring), for
// a multi-line field. It is a sibling file rather than a prop on Input because
// <input> and <textarea> have genuinely different native prop sets, and a
// discriminated union over an `as` prop would be harder to read than this
// duplication.
export function Textarea({
  label,
  hint,
  error,
  id,
  className,
  ...props
}: ComponentProps<"textarea"> & {
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
      <textarea
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
