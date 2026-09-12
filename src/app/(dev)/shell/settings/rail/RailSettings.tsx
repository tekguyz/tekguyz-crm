"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  BrandingBlock,
  OrgProfileFields,
  WebhookBlock,
} from "@/app/(dev)/shell/settings/preview/SettingsBlocks";
import {
  SETTINGS_SECTIONS,
  type SettingsSectionId,
} from "@/app/(dev)/shell/settings/preview/sections";
import type { OrgProfileValues } from "@/app/(dev)/shell/settings/preview/mock-org";

// VARIANT RAIL — a section rail beside the content, one section at a time.
//
// Its bet is that Settings grows. Today there are three sections here and
// four panels on the shipped page; a rail is the layout that still works at
// eight, because reaching the last one stays one click rather than a long
// scroll. It also gives every section a name in a fixed place, which is the
// one thing a stacked page cannot do.
//
// Its cost is that it hides things. Two of the three sections are not on
// screen, so "what else is in Settings" becomes a question the rail answers
// by label only — and a label is a promise about content you cannot see. With
// three sections that is a real cost for very little gain, which is exactly
// the trade the review has to judge.
//
// A SWITCHER, NOT A JUMP STRIP, and the difference is deliberate. The picked
// detail panel already owns the jump-strip answer for a long single document;
// repeating it here would give the review two spellings of one idea instead of
// two ideas. This one genuinely swaps the pane.
//
// aria-current="page" on the active row, not aria-pressed: these select which
// pane is shown, which is navigation, not a toggle. Nothing here suppresses
// the global :focus-visible outline — these are interactive rows, Button
// carries the app's own focus ring, and CLAUDE.md is explicit that copying
// shadcn's focus-suppressing utility onto one silently deletes that floor.
export function RailSettings({ initial }: { initial: OrgProfileValues }) {
  const [active, setActive] = useState<SettingsSectionId>("profile");
  const section = SETTINGS_SECTIONS.find((entry) => entry.id === active) ?? SETTINGS_SECTIONS[0];

  return (
    <div className="mx-auto flex w-full max-w-5xl gap-6 p-6">
      <nav aria-label="Settings sections" className="flex w-52 shrink-0 flex-col gap-1">
        {SETTINGS_SECTIONS.map((entry) => (
          <Button
            key={entry.id}
            type="button"
            variant={entry.id === active ? "secondary" : "ghost"}
            aria-current={entry.id === active ? "page" : undefined}
            onClick={() => setActive(entry.id)}
            // justify-start, because Button centres by default and a nav row
            // whose label floats in the middle of a 208px rail does not read as
            // a list. min-w-0 + truncate so a longer section name later cannot
            // widen the rail or spill out of it.
            className="w-full justify-start"
          >
            <span className="min-w-0 truncate">{entry.label}</span>
          </Button>
        ))}
      </nav>

      <Card className="min-w-0 flex-1 p-6">
        <h2 className="text-h2">{section.label}</h2>
        <p className="text-body-sm mt-1 mb-4 text-ink-muted">{section.blurb}</p>

        {section.id === "profile" && <OrgProfileFields initial={initial} />}
        {section.id === "branding" && <BrandingBlock />}
        {section.id === "webhook" && <WebhookBlock />}

        {section.id === "profile" ? (
          <div className="mt-4">
            <Button type="button" variant="primary">
              Save changes
            </Button>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
