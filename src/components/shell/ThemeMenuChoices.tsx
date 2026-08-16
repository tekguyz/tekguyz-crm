"use client";

import {
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { THEME_CHOICES, useThemeChoice } from "@/components/shell/theme-choices";

// The theme control renders INLINE inside the identity menu rather than as its
// own header button.
//
// A Radix radio group, not three loose buttons: the menu owns roving focus, so
// only a real menu item is reachable with the arrow keys, and radio semantics
// are what "one of three, this one is on" actually means to a screen reader.
export function ThemeMenuChoices() {
  const { mounted, current, setTheme } = useThemeChoice();

  return (
    <>
      <DropdownMenuLabel className="text-label text-ink-muted">Theme</DropdownMenuLabel>
      <DropdownMenuRadioGroup
        // Before mount there is no truthful answer, so no row is marked. The
        // rows themselves still render, so the menu does not change height.
        value={mounted ? current : ""}
        onValueChange={setTheme}
      >
        {THEME_CHOICES.map(({ value, label, icon: Icon }) => (
          <DropdownMenuRadioItem key={value} value={value}>
            <Icon className="size-4" stroke={1.75} />
            {label}
          </DropdownMenuRadioItem>
        ))}
      </DropdownMenuRadioGroup>
    </>
  );
}
