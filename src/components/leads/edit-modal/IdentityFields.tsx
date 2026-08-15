import type { Lead } from "@/lib/leads/queries";
import { Input } from "@/components/ui/Input";

// Who the lead is. Uncontrolled (defaultValue) — the native
// <form action={serverAction}> reads these straight off FormData, so no state
// lives here and nothing needs bridging up to the shell.
//
// `website`, `lead_source`, and `service_category` are rendered here for a
// correctness reason, not a cosmetic one: updateLead() writes all three
// unconditionally (`formData.get(x) || null`). With no input present,
// formData.get() returned null and every save silently NULLed all three —
// destroying real webhook/CSV-captured attribution data. Same latent bug the
// 2026-07-27 Lead Field Completion pass fixed for physical_address and the
// social columns; these three were missed in that sweep. Any column
// updateLead writes must have an input here, or it gets wiped on save.
//
// Input owns its own <label> and generates the htmlFor/id pair, which the
// hand-rolled label/input pairs this replaced never wired up.
export function IdentityFields({ lead }: { lead: Lead }) {
  return (
    <>
      <Input label="Client name" name="client_name" defaultValue={lead.client_name} required />
      <Input label="Email" name="email" type="email" defaultValue={lead.email} required />
      <div className="grid grid-cols-2 gap-3">
        <Input label="Phone" name="phone" defaultValue={lead.phone ?? ""} />
        <Input label="Company" name="company" defaultValue={lead.company ?? ""} />
      </div>
      <Input label="Website" name="website" defaultValue={lead.website ?? ""} />
      <div className="grid grid-cols-2 gap-3">
        <Input label="Lead source" name="lead_source" defaultValue={lead.lead_source ?? ""} />
        <Input
          label="Service category"
          name="service_category"
          defaultValue={lead.service_category ?? ""}
        />
      </div>
    </>
  );
}
