import type { Lead } from "@/lib/leads/queries";
import { inputClass, labelClass } from "@/components/leads/edit-modal/field-styles";

// Where to find the lead — the physical address (which drives the Contacts
// Google Maps deep link) plus the three social profile columns. Grouped
// together because they're all "reachability" data rather than pipeline state,
// and because all four were completed as one unit in the 2026-07-27 Lead Field
// Completion pass.
export function AddressSocialFields({ lead }: { lead: Lead }) {
  return (
    <>
      <div>
        <label className={labelClass}>Physical address</label>
        <input
          name="physical_address"
          defaultValue={lead.physical_address ?? ""}
          className={inputClass}
        />
      </div>

      <div className="border-t border-hairline pt-3">
        <label className={labelClass}>Social profiles</label>
        <div className="space-y-2">
          <input
            name="social_google_business"
            defaultValue={lead.social_google_business ?? ""}
            placeholder="Google Business Profile URL"
            className={inputClass}
          />
          <input
            name="social_facebook"
            defaultValue={lead.social_facebook ?? ""}
            placeholder="Facebook URL"
            className={inputClass}
          />
          <input
            name="social_instagram"
            defaultValue={lead.social_instagram ?? ""}
            placeholder="Instagram URL"
            className={inputClass}
          />
        </div>
      </div>
    </>
  );
}
