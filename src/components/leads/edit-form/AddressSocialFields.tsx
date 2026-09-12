"use client";

import { useState } from "react";

import type { Lead } from "@/lib/leads/queries";
import { Input } from "@/components/ui/Input";

// Where to find the lead — the physical address (which drives the Contacts
// Google Maps deep link) plus the three social profile columns. Grouped
// together because they're all "reachability" data rather than pipeline state,
// and because all four were completed as one unit in the 2026-07-27 Lead Field
// Completion pass.
//
// CONTROLLED, not defaultValue. React 19 resets a <form action={...}> after the
// action returns — including on failure — and the reset does not respect file
// boundaries: this group shares one <form> with four sibling files, so an
// uncontrolled field here loses its edit even when every other group is fixed.
// See CLAUDE.md § Form/Action Field Parity.
//
// The three social inputs share one group label, so they carry an aria-label
// each instead of a visible one — Input renders no <label> when none is passed.
export function AddressSocialFields({ lead }: { lead: Lead }) {
  const [values, setValues] = useState({
    physical_address: lead.physical_address ?? "",
    social_google_business: lead.social_google_business ?? "",
    social_facebook: lead.social_facebook ?? "",
    social_instagram: lead.social_instagram ?? "",
  });

  const field = (name: keyof typeof values) => ({
    name,
    value: values[name],
    onChange: (event: { target: { value: string } }) =>
      setValues((current) => ({ ...current, [name]: event.target.value })),
  });

  return (
    <>
      <Input label="Physical address" {...field("physical_address")} />

      <div className="border-t border-hairline pt-3">
        <p className="text-label mb-1 text-ink-muted">Social profiles</p>
        <div className="space-y-2">
          <Input
            {...field("social_google_business")}
            aria-label="Google Business Profile URL"
            placeholder="Google Business Profile URL"
          />
          <Input
            {...field("social_facebook")}
            aria-label="Facebook URL"
            placeholder="Facebook URL"
          />
          <Input
            {...field("social_instagram")}
            aria-label="Instagram URL"
            placeholder="Instagram URL"
          />
        </div>
      </div>
    </>
  );
}
