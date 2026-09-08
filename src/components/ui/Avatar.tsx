import type { ComponentProps } from "react";

import { cn } from "@/lib/utils/cn";

// Initials on a deterministic, hash-selected background. Zero storage: no
// photo, no column, no bucket. Real photo upload is deliberately deferred.
//
// WHY NOT RADIX. `@shadcn/avatar` (queried live from the registry, per
// CLAUDE.md § UI/UX Design System step 2) wraps Radix's Avatar primitive, whose
// entire job is coordinating an <img> load state between Image and Fallback.
// With no image there is nothing to coordinate — Root would only add a context
// and a dependency with no consumer. The structure below is shadcn's (same
// `data-slot`, same size ramp, same class shape); every class is remapped onto
// this project's own tokens. If photo upload ever lands, that is when Radix's
// Root/Image/Fallback earns its place.

export type AvatarTone = "purple" | "pink" | "orange" | "teal" | "green" | "sky";

// The decorative pill palette from globals.css, and only that. Each hue already
// ships a matched bg/fg pair tuned for AA in both themes, which is why nothing
// here computes a contrast colour or hardcodes white — the failure --accent-fg
// and --danger-fg exist to prevent is avoided by never inventing a third set.
// --accent is not in this list and must not be: it is for CTAs, active nav,
// focus rings and inline links only.
const TONES: Record<AvatarTone, string> = {
  purple: "bg-pill-purple-bg text-pill-purple-fg",
  pink: "bg-pill-pink-bg text-pill-pink-fg",
  orange: "bg-pill-orange-bg text-pill-orange-fg",
  teal: "bg-pill-teal-bg text-pill-teal-fg",
  green: "bg-pill-green-bg text-pill-green-fg",
  sky: "bg-pill-sky-bg text-pill-sky-fg",
};

// Order is load-bearing: it is the hash's index space. Reordering this array
// silently repaints every avatar in the app a different colour.
const TONE_ORDER: AvatarTone[] = ["purple", "pink", "orange", "teal", "green", "sky"];

const SIZES = {
  sm: "size-6 text-caption",
  default: "size-8 text-label",
  lg: "size-10 text-body-sm",
} as const;

export type AvatarSize = keyof typeof SIZES;

/**
 * FNV-1a, 32-bit. Chosen over `Array.reduce((h, c) => h * 31 + c)` because that
 * one overflows past Number.MAX_SAFE_INTEGER on long strings and stops being
 * deterministic across inputs of different length. `>>> 0` after each step keeps
 * every intermediate an unsigned 32-bit integer, so the result is identical on
 * every render, every process and both server and client.
 */
export function hashString(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/**
 * Same name in, same hue out — case and any amount of whitespace do not change
 * it. The `\s+` collapse is not cosmetic: `getInitials` already treats
 * "Ada Lovelace" and "  ada   lovelace  " as the same person, so hashing the
 * merely-trimmed string gave one person two colours. Caught in the browser on
 * /design, where the two rendered side by side as AL-on-orange and AL-on-green.
 */
export function avatarToneFor(name: string): AvatarTone {
  const key = name.trim().toLowerCase().replace(/\s+/g, " ");
  return TONE_ORDER[hashString(key) % TONE_ORDER.length];
}

/**
 * Two words -> two initials, one word -> one, nothing usable -> "?".
 * Array.from, not [0], so an astral-plane first character is not split into
 * half a surrogate pair.
 */
export function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";

  const first = Array.from(words[0])[0] ?? "";
  const last = words.length > 1 ? (Array.from(words[words.length - 1])[0] ?? "") : "";
  const initials = (first + last).toUpperCase();

  return initials || "?";
}

export function Avatar({
  name,
  size = "default",
  className,
  ...props
}: Omit<ComponentProps<"span">, "children"> & {
  name: string;
  size?: AvatarSize;
}) {
  const initials = getInitials(name);

  return (
    <span
      data-slot="avatar"
      data-size={size}
      // aria-hidden, with the real name carried by title: initials are a visual
      // shorthand and a screen reader announcing "AL" helps nobody. Callers that
      // render the avatar alone must label the control around it.
      aria-hidden="true"
      title={name.trim() || undefined}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-medium select-none",
        SIZES[size],
        TONES[avatarToneFor(name)],
        className,
      )}
      {...props}
    >
      {initials}
    </span>
  );
}
