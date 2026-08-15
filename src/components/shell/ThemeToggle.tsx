"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { IconSun, IconMoon, IconDeviceDesktop } from "@tabler/icons-react";
import { Button } from "@/components/ui/Button";

// Three-state cycle (System → Light → Dark), not a two-state light/dark
// switch. The root ThemeProvider is configured with defaultTheme="system"
// enableSystem, so "follow the OS" is a real, meaningful state here — a
// two-state toggle would call setTheme("light"|"dark") on first use and
// permanently strip that option, with no way back short of clearing
// localStorage.
const ORDER = ["system", "light", "dark"] as const;
type ThemeChoice = (typeof ORDER)[number];

const ICONS = { system: IconDeviceDesktop, light: IconSun, dark: IconMoon };
const LABELS = { system: "System", light: "Light", dark: "Dark" };

// Squares off Button's md size for an icon-only control. The design tokens
// themselves are untouched — this is layout, not a new variant.
const ICON_BUTTON_CLASS = "w-8 px-0";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // The server can't know the client's stored/OS theme, so rendering the real
  // icon before mount would guarantee a hydration mismatch. Hold an
  // identically-sized placeholder until then to avoid a layout shift.
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    // tabIndex={-1} rather than `disabled`: disabled would paint the
    // opacity-50 state for one frame before mount, which the plain <div>
    // placeholder never did.
    return (
      <Button
        type="button"
        variant="secondary"
        className={ICON_BUTTON_CLASS}
        aria-hidden
        tabIndex={-1}
      />
    );
  }

  const current = (ORDER.includes(theme as ThemeChoice) ? theme : "system") as ThemeChoice;
  const next = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length];
  const Icon = ICONS[current];

  return (
    <Button
      type="button"
      variant="secondary"
      onClick={() => setTheme(next)}
      title={`Theme: ${LABELS[current]} — switch to ${LABELS[next]}`}
      aria-label={`Theme: ${LABELS[current]}. Switch to ${LABELS[next]}.`}
      className={ICON_BUTTON_CLASS}
    >
      <Icon className="size-5" stroke={1.75} />
    </Button>
  );
}
