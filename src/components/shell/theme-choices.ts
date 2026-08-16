"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { IconSun, IconMoon, IconDeviceDesktop } from "@tabler/icons-react";

import type { NavIcon } from "@/components/ui/NavItem";

// Three states, not a two-state light/dark switch. The root ThemeProvider runs
// defaultTheme="system" enableSystem, so "follow the OS" is a real, meaningful
// choice — a two-state toggle calls setTheme("light"|"dark") on first use and
// permanently strips that option with no way back short of clearing storage.
//
// This replaces the old cycle button. A cycle hides the current state behind
// one glyph and makes the user click to discover it; three explicit choices
// show which is active and cost the same single interaction to change.
export const THEME_CHOICES = [
  { value: "system", label: "System", icon: IconDeviceDesktop },
  { value: "light", label: "Light", icon: IconSun },
  { value: "dark", label: "Dark", icon: IconMoon },
] as const satisfies readonly { value: string; label: string; icon: NavIcon }[];

export type ThemeChoice = (typeof THEME_CHOICES)[number]["value"];

// The server cannot know the client's stored or OS theme, so reporting a real
// current value before mount would guarantee a hydration mismatch. `mounted`
// lets a caller render a neutral, identically-sized state until then.
export function useThemeChoice() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const current = (THEME_CHOICES.some((c) => c.value === theme) ? theme : "system") as ThemeChoice;

  return { mounted, current, setTheme };
}
