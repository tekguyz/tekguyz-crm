import type { Lead } from "@/lib/leads/queries";
import { inputClass, labelClass } from "@/components/leads/edit-modal/field-styles";

// Who the lead is. Uncontrolled (defaultValue) — the native
// <form action={serverAction}> reads these straight off FormData, so no state
// lives here and nothing needs bridging up to the shell.
//
// Note: `website` is deliberately absent. updateLead() writes it from FormData,
// but this modal has never rendered an input for it — carried over as-is rather
// than "fixed" here, since this split is a pure structural extraction.
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
    </>
  );
}
