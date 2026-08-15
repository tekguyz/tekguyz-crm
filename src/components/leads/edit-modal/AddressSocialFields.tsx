import type { Lead } from "@/lib/leads/queries";
import { Input } from "@/components/ui/Input";

// Where to find the lead — the physical address (which drives the Contacts
// Google Maps deep link) plus the three social profile columns. Grouped
// together because they're all "reachability" data rather than pipeline state,
// and because all four were completed as one unit in the 2026-07-27 Lead Field
// Completion pass.
//
// The three social inputs share one group label, so they carry an aria-label
// each instead of a visible one — Input renders no <label> when none is passed.
export function AddressSocialFields({ lead }: { lead: Lead }) {
  return (
    <>
      <Input
        label="Physical address"
        name="physical_address"
        defaultValue={lead.physical_address ?? ""}
      />

      <div className="border-t border-hairline pt-3">
        <p className="text-label mb-1 text-ink-muted">Social profiles</p>
        <div className="space-y-2">
          <Input
            name="social_google_business"
            aria-label="Google Business Profile URL"
            defaultValue={lead.social_google_business ?? ""}
            placeholder="Google Business Profile URL"
          />
          <Input
            name="social_facebook"
            aria-label="Facebook URL"
            defaultValue={lead.social_facebook ?? ""}
            placeholder="Facebook URL"
          />
          <Input
            name="social_instagram"
            aria-label="Instagram URL"
            defaultValue={lead.social_instagram ?? ""}
            placeholder="Instagram URL"
          />
        </div>
      </div>
    </>
  );
}
