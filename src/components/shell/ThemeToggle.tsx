"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { IconSun, IconMoon, IconDeviceDesktop } from "@tabler/icons-react";

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

const BUTTON_CLASS =
  "flex size-8 items-center justify-center rounded-md border border-hairline text-ink-muted transition-colors hover:bg-canvas-soft hover:text-ink-main";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // The server can't know the client's stored/OS theme, so rendering the real
  // icon before mount would guarantee a hydration mismatch. Hold an
  // identically-sized placeholder until then to avoid a layout shift.
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className={BUTTON_CLASS} aria-hidden />;
  }

  const current = (ORDER.includes(theme as ThemeChoice) ? theme : "system") as ThemeChoice;
  const next = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length];
  const Icon = ICONS[current];

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      title={`Theme: ${LABELS[current]} — switch to ${LABELS[next]}`}
      aria-label={`Theme: ${LABELS[current]}. Switch to ${LABELS[next]}.`}
      className={BUTTON_CLASS}
    >
      <Icon className="size-4" />
    </button>
  );
}
