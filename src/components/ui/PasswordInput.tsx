"use client";

import { useState } from "react";
import { IconEye, IconEyeOff } from "@tabler/icons-react";

import { Input } from "@/components/ui/Input";

// Composes the v2 Input primitive rather than hand-rolling a styled <input>,
// so the field picks up the Level 0 treatment and the shared accent focus ring
// automatically. The props, the toggle behaviour and both aria-label strings
// are unchanged from the pre-v2 version — every existing call site still works.
//
// The toggle is tabIndex={-1} on purpose: the field itself is the tab stop, and
// a keyboard user reaching a "Show password" control before ever typing into
// the field is noise. `pr-9` reserves room so the eye never overlaps the value.
export function PasswordInput({
  name,
  placeholder,
  required,
  minLength,
}: {
  name: string;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input
        type={visible ? "text" : "password"}
        name={name}
        placeholder={placeholder}
        required={required}
        minLength={minLength}
        className="pr-9"
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        className="absolute top-1/2 right-2 -translate-y-1/2 text-ink-muted transition-colors hover:text-ink-main"
      >
        {visible ? (
          <IconEyeOff className="size-4" stroke={1.75} />
        ) : (
          <IconEye className="size-4" stroke={1.75} />
        )}
      </button>
    </div>
  );
}
