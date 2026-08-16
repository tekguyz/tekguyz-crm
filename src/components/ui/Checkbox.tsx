"use client";

import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { IconCheck } from "@tabler/icons-react";

import { cn } from "@/lib/utils/cn";

// Standard shadcn/ui checkbox structure (Radix primitive, "data-slot"
// convention), styled with this app's own design tokens instead of shadcn's
// default CSS variables — same recipe as alert-dialog.tsx / dialog.tsx /
// popover.tsx.
//
// Every state is derived from an existing primitive rather than invented:
//   unchecked        = Input's resting field (hairline border, canvas-pure)
//   unchecked:hover  = Button `secondary`'s hover (canvas-soft wash)
//   checked          = Button `primary` (bg-accent + text-accent-fg)
//   checked:hover    = Button `primary`'s hover (opacity-90)
//   disabled         = Input's disabled (cursor-not-allowed, opacity-50)
// text-accent-fg, never a hardcoded white: --accent flips lightness between
// themes, which is the whole reason the -fg pair exists.
//
// Focus needs no rule here. Radix renders a <button role="checkbox">, so the
// global 2px :focus-visible outline in globals.css applies — the field-ring
// rule beside it targets `input` only, and already excluded [type=checkbox]
// from it deliberately.
//
// The `label` prop is not decoration. Radix's box is a <button>, so an
// enclosing <label> would not toggle it the way it toggles a native
// checkbox; the id/htmlFor pair has to be wired for the text to stay
// clickable. Input owns the same wiring for the same reason.
function Checkbox({
  className,
  label,
  id,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root> & { label?: string }) {
  const generatedId = React.useId();
  const fieldId = id ?? generatedId;

  const box = (
    <CheckboxPrimitive.Root
      id={fieldId}
      data-slot="checkbox"
      className={cn(
        "size-4 shrink-0 rounded-xs border border-hairline bg-canvas-pure transition-colors",
        "data-[state=unchecked]:hover:bg-canvas-soft",
        "data-[state=checked]:border-transparent data-[state=checked]:bg-accent data-[state=checked]:text-accent-fg data-[state=checked]:hover:opacity-90",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="flex items-center justify-center text-current"
      >
        <IconCheck className="size-3" stroke={2} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );

  if (!label) return box;

  return (
    <div className="flex items-center gap-2">
      {box}
      <label htmlFor={fieldId} className="text-body-md text-ink-main">
        {label}
      </label>
    </div>
  );
}

export { Checkbox };
