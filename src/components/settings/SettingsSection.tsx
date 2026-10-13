import type { ReactNode } from "react";

import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils/cn";

// VARIANT SPLIT, wired from the Stage 1 comp (/shell/settings/split): each
// section's name and explanation to the LEFT of its own controls, with a
// full-bleed hairline between sections. Below `md` the two columns stack, which
// is why Split was picked — it needs no separate phone layout.
//
// ONE surface for the whole page, not a Card per panel. The panels used to be
// four separate Cards, each with its own <h2>; the hairline between rows now
// says "different kind of record", the same way the picked lead read panel
// does. The padding therefore lives on each row, not on the Card, so the rule
// reaches both edges.
export function SettingsSplit({ children }: { children: ReactNode }) {
  return <Card className="mx-auto w-full max-w-5xl p-0">{children}</Card>;
}

// The icon wears a pill hue, spelled out so Tailwind's scanner sees every class.
const ICON_TONE = {
  sky: "text-pill-sky-fg",
  purple: "text-pill-purple-fg",
  orange: "text-pill-orange-fg",
  green: "text-pill-green-fg",
} as const;

export function SettingsSection({
  label,
  blurb,
  help,
  icon,
  tone,
  children,
  className,
}: {
  label: string;
  blurb: string;
  /** A Tabler icon element before the heading, coloured by `tone`. */
  icon?: ReactNode;
  tone?: keyof typeof ICON_TONE;
  /** An optional HelpTooltip, rendered beside the heading. */
  help?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "flex flex-col gap-4 border-b border-hairline px-4 py-5 last:border-b-0 md:flex-row md:gap-8 md:px-6",
        className,
      )}
    >
      {/* A fixed basis plus min-w-0, not a percentage: the explanation keeps a
          readable measure while the controls take the rest. A percentage column
          collapses the text toward one word per line as the window narrows. */}
      <div className="min-w-0 md:w-64 md:shrink-0">
        <h2 className="text-title flex items-center gap-1.5">
          {icon ? (
            <span aria-hidden="true" className={cn("shrink-0", tone && ICON_TONE[tone])}>
              {icon}
            </span>
          ) : null}
          {label}
          {help}
        </h2>
        <p className="text-body-sm mt-1 text-ink-muted">{blurb}</p>
      </div>

      <div className="min-w-0 flex-1">{children}</div>
    </section>
  );
}
