"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

// Standard shadcn/ui sonner wrapper — syncs with next-themes (already used
// app-wide for ThemeToggle) and maps sonner's CSS variables onto this app's
// own tokens instead of shadcn's defaults.
function Toaster({ ...props }: ToasterProps) {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--canvas-pure)",
          "--normal-text": "var(--ink-main)",
          "--normal-border": "var(--hairline)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
}

export { Toaster };
