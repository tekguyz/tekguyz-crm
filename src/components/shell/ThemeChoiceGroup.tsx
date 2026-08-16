"use client";

import { THEME_CHOICES, useThemeChoice } from "@/components/shell/theme-choices";
import { Button } from "@/components/ui/Button";

// The same three theme choices as ThemeMenuChoices, in the shape a sheet can
// use. The dropdown version has to be Radix menu items to join the menu's
// roving focus; a sheet has ordinary tab order, so plain Buttons are correct
// here and there is no menu semantics to borrow.
//
// role="group" + aria-pressed rather than a radio group: these are buttons, and
// aria-pressed is the honest description of a button that stays on.
export function ThemeChoiceGroup() {
  const { mounted, current, setTheme } = useThemeChoice();

  return (
    <div>
      <p className="text-label px-1 pb-1.5 text-ink-muted">Theme</p>
      <div role="group" aria-label="Theme" className="flex gap-1.5">
        {THEME_CHOICES.map(({ value, label, icon: Icon }) => {
          // Before mount there is no truthful current value, so nothing is
          // marked on. The buttons are full-size from the first paint, so this
          // never shifts layout.
          const selected = mounted && current === value;

          return (
            <Button
              key={value}
              type="button"
              variant={selected ? "primary" : "secondary"}
              aria-pressed={selected}
              onClick={() => setTheme(value)}
              className="flex-1"
            >
              <Icon className="size-5" stroke={1.75} />
              {label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
