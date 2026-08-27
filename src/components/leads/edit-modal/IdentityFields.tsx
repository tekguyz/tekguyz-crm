"use client";

import { useState } from "react";

import type { Lead } from "@/lib/leads/queries";
import { Input } from "@/components/ui/Input";

// Who the lead is.
//
// `website`, `lead_source`, and `service_category` are rendered here for a
// correctness reason, not a cosmetic one: updateLead() writes all seven
// unconditionally (`formData.get(x) || null`). With no input present,
// formData.get() returned null and every save silently NULLed all three —
// destroying real webhook/CSV-captured attribution data. Same latent bug the
// 2026-07-27 Lead Field Completion pass fixed for physical_address and the
// social columns; these three were missed in that sweep. Any column
// updateLead writes must have an input here, or it gets wiped on save.
//
// CONTROLLED, not defaultValue, and that is load-bearing. React 19 resets a
// <form action={...}> after the action returns — including on failure — by
// calling form.reset() and re-rendering. Uncontrolled fields reverted to the
// lead's STORED values, so every correction the user had just made vanished and
// the form looked untouched. That is the worst shape of this bug: there is no
// visible sign anything was lost. See CLAUDE.md § Form/Action Field Parity.
//
// State is seeded from the lead once. EditLeadModal remounts this subtree when
// it opens, which is what picks up a lead edited elsewhere.
//
// Input owns its own <label> and generates the htmlFor/id pair, which the
// hand-rolled label/input pairs this replaced never wired up.
export function IdentityFields({ lead }: { lead: Lead }) {
  const [values, setValues] = useState({
    client_name: lead.client_name,
    email: lead.email,
    phone: lead.phone ?? "",
    company: lead.company ?? "",
    website: lead.website ?? "",
    lead_source: lead.lead_source ?? "",
    service_category: lead.service_category ?? "",
  });

  const field = (name: keyof typeof values) => ({
    name,
    value: values[name],
    onChange: (event: { target: { value: string } }) =>
      setValues((current) => ({ ...current, [name]: event.target.value })),
  });

  return (
    <>
      <Input label="Client name" {...field("client_name")} required />
      <Input label="Email" type="email" {...field("email")} required />
      <div className="grid grid-cols-2 gap-3">
        <Input label="Phone" {...field("phone")} />
        <Input label="Company" {...field("company")} />
      </div>
      <Input label="Website" {...field("website")} />
      <div className="grid grid-cols-2 gap-3">
        <Input label="Lead source" {...field("lead_source")} />
        <Input label="Service category" {...field("service_category")} />
      </div>
    </>
  );
}
