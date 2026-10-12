"use client";

import {
  IconBrandFacebook,
  IconBrandGoogle,
  IconBrandInstagram,
  IconBrandWhatsapp,
  IconMapPin,
} from "@tabler/icons-react";
import { useState } from "react";

import type { Lead } from "@/lib/leads/queries";
import { Input } from "@/components/ui/Input";

// Where to find the lead — the physical address (which drives the Contacts
// Google Maps deep link) plus the four social profile columns. Grouped
// together because they're all "reachability" data rather than pipeline state.
// The first four were completed as one unit in the 2026-07-27 Lead Field
// Completion pass; WhatsApp joined for Muse Lead Packs (#37).
//
// CONTROLLED, not defaultValue. React 19 resets a <form action={...}> after the
// action returns — including on failure — and the reset does not respect file
// boundaries: this group shares one <form> with four sibling files, so an
// uncontrolled field here loses its edit even when every other group is fixed.
// See CLAUDE.md § Form/Action Field Parity.
//
// The four social inputs have visible labels with their brand icons, the same
// as the create drawer: a placeholder is not a label once the field has text.
export function AddressSocialFields({ lead }: { lead: Lead }) {
  const [values, setValues] = useState({
    physical_address: lead.physical_address ?? "",
    social_google_business: lead.social_google_business ?? "",
    social_facebook: lead.social_facebook ?? "",
    social_instagram: lead.social_instagram ?? "",
    social_whatsapp: lead.social_whatsapp ?? "",
  });

  const field = (name: keyof typeof values) => ({
    name,
    value: values[name],
    onChange: (event: { target: { value: string } }) =>
      setValues((current) => ({ ...current, [name]: event.target.value })),
  });

  return (
    <>
      <Input label="Physical address" icon={IconMapPin} {...field("physical_address")} />

      <div className="grid gap-3 border-t border-hairline pt-3 sm:grid-cols-2">
        <Input
          label="Google Business Profile"
          icon={IconBrandGoogle}
          {...field("social_google_business")}
          placeholder="https://…"
        />
        <Input
          label="Facebook"
          icon={IconBrandFacebook}
          {...field("social_facebook")}
          placeholder="https://facebook.com/…"
        />
        <Input
          label="Instagram"
          icon={IconBrandInstagram}
          {...field("social_instagram")}
          placeholder="https://instagram.com/…"
        />
        <Input
          label="WhatsApp"
          icon={IconBrandWhatsapp}
          {...field("social_whatsapp")}
          placeholder="https://wa.me/…"
        />
      </div>
    </>
  );
}
