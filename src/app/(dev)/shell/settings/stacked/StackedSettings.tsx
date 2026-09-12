import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  BrandingBlock,
  OrgProfileFields,
  WebhookBlock,
} from "@/app/(dev)/shell/settings/preview/SettingsBlocks";
import { SETTINGS_SECTIONS } from "@/app/(dev)/shell/settings/preview/sections";
import type { OrgProfileValues } from "@/app/(dev)/shell/settings/preview/mock-org";

// VARIANT STACKED — the shipped shape, restyled. One card per section, one
// column, everything visible at once.
//
// Its bet is that a settings page with three sections does not need
// navigation. You scroll, you see everything, and nothing is hidden behind a
// click — the same bet the picked detail panel (Variant A — Jump strip) made
// about a lead's sections.
//
// Its cost is width. A single column capped for readable line length leaves
// most of a 1440px screen empty, and every section's explanation has to sit
// above its controls, which pushes the controls down.
//
// The cap is max-w-3xl rather than edge to edge: a text input stretched
// across 1400px is a measurably worse control, and the shipped /settings page
// already runs inside the app shell's own content width.
export function StackedSettings({ initial }: { initial: OrgProfileValues }) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-6">
      {SETTINGS_SECTIONS.map((section) => (
        <Card key={section.id} className="p-6">
          <h2 className="text-h2">{section.label}</h2>
          <p className="text-body-sm mt-1 mb-4 text-ink-muted">{section.blurb}</p>

          {section.id === "profile" && <OrgProfileFields initial={initial} />}
          {section.id === "branding" && <BrandingBlock />}
          {section.id === "webhook" && <WebhookBlock />}

          {/* Only the editable section gets a save row. Branding has nothing to
              save and the webhook block's own rotate control is its action —
              a save button under either would be a dead control. */}
          {section.id === "profile" ? (
            <div className="mt-4">
              <Button type="button" variant="primary">
                Save changes
              </Button>
            </div>
          ) : null}
        </Card>
      ))}
    </div>
  );
}
