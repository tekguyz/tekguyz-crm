import type { ComponentProps } from "react";

import { cn } from "@/lib/utils/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md";

// Design System v2: every variant is Level 0 — hairline border, no shadow.
// v1 gave buttons a Level-1 shadow; that is deliberately gone. The -fg tokens
// exist because --accent and --danger flip lightness between themes, so a
// fixed white foreground would fail contrast in dark mode.
const VARIANTS: Record<ButtonVariant, string> = {
  primary: "border-transparent bg-accent text-accent-fg hover:opacity-90",
  secondary: "border-hairline bg-canvas-pure text-ink-main hover:bg-canvas-soft",
  ghost:
    "border-transparent bg-transparent text-ink-muted hover:bg-canvas-soft hover:text-ink-main",
  danger: "border-transparent bg-danger text-danger-fg hover:opacity-90",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "text-body-sm h-7 gap-1.5 px-2",
  md: "text-body-md h-8 gap-2 px-3",
};

export function Button({
  variant = "secondary",
  size = "md",
  loading = false,
  disabled,
  className,
  children,
  ...props
}: ComponentProps<"button"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}) {
  return (
    <button
      disabled={disabled ?? loading}
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex items-center justify-center rounded-md border font-medium transition-colors",
        "disabled:pointer-events-none disabled:opacity-50",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {loading ? (
        <span
          aria-hidden
          className="size-3 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      ) : null}
      {children}
    </button>
  );
}
