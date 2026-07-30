import type { Lead } from "@/lib/leads/queries";
import { inputClass, labelClass } from "@/components/leads/edit-modal/field-styles";

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
export function IdentityFields({ lead }: { lead: Lead }) {
  return (
    <>
      <div>
        <label className={labelClass}>Client name</label>
        <input
          name="client_name"
          defaultValue={lead.client_name}
          required
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass}>Email</label>
        <input
          name="email"
          type="email"
          defaultValue={lead.email}
          required
          className={inputClass}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Phone</label>
          <input name="phone" defaultValue={lead.phone ?? ""} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Company</label>
          <input name="company" defaultValue={lead.company ?? ""} className={inputClass} />
        </div>
      </div>
      <div>
        <label className={labelClass}>Website</label>
        <input name="website" defaultValue={lead.website ?? ""} className={inputClass} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Lead source</label>
          <input
            name="lead_source"
            defaultValue={lead.lead_source ?? ""}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Service category</label>
          <input
            name="service_category"
            defaultValue={lead.service_category ?? ""}
            className={inputClass}
          />
        </div>
      </div>
    </>
  );
}
