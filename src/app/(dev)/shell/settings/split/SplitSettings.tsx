import { Button } from "@/components/ui/Button";
import {
  BrandingBlock,
  OrgProfileFields,
  WebhookBlock,
} from "@/app/(dev)/shell/settings/preview/SettingsBlocks";
import { SETTINGS_SECTIONS } from "@/app/(dev)/shell/settings/preview/sections";
import type { OrgProfileValues } from "@/app/(dev)/shell/settings/preview/mock-org";

// VARIANT SPLIT — each section's name and explanation to the LEFT of its own
// controls, with a full-bleed hairline between sections.
//
// Its bet is that the explanation is the thing stealing vertical space. In the
// stacked variant every section spends two or three lines saying what it is
// before the first control appears; here that text moves sideways into space
// the page already had, so all three sections' controls sit higher and closer
// together. Nothing is hidden and there is no navigation to learn.
//
// Its cost is the narrow left column at small widths: below the `md`
// breakpoint the two columns have to stack anyway, at which point this
// variant IS the stacked one with extra rules — so it buys nothing on a
// phone, and the review should judge it knowing that.
//
// FULL-BLEED RULES BETWEEN SECTIONS, not gaps. That is the treatment the
// picked detail panel (Variant A) landed on for the same problem, and for the
// same reason: whitespace alone cannot say "this is a different kind of
// record" in a monochrome system, and a hairline can. The padding therefore
// lives on each row rather than on the scroller, so the border reaches both
// edges.
export function SplitSettings({ initial }: { initial: OrgProfileValues }) {
  return (
    <div className="mx-auto w-full max-w-5xl">
      {SETTINGS_SECTIONS.map((section) => (
        <section
          key={section.id}
          className="flex flex-col gap-4 border-b border-hairline px-6 py-6 last:border-b-0 md:flex-row md:gap-8"
        >
          {/* A fixed basis plus min-w-0, not a percentage: the explanation
              column has to keep a readable measure while the controls take the
              rest, and a percentage column collapses the text toward one word
              per line as the window narrows. */}
          <div className="min-w-0 md:w-64 md:shrink-0">
            <h2 className="text-title">{section.label}</h2>
            <p className="text-body-sm mt-1 text-ink-muted">{section.blurb}</p>
          </div>

          <div className="min-w-0 flex-1">
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
          </div>
        </section>
      ))}
    </div>
  );
}
