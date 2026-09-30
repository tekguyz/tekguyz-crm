"use client";

import { useRef, useState } from "react";

import { useFormResetRestore } from "@/lib/forms/use-form-reset-restore";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FormSection } from "@/components/leads/edit-form/FormSection";

// Field parity with createLead() is the whole point of this list: every key
// below has a matching formData.get() in @/lib/leads/actions.ts, and every
// formData.get() there has an input here. Twelve each way. website /
// lead_source / service_category in particular were read-but-never-rendered
// once already (see ADDENDA_LOG § Silent NULL-on-save).
//
// TWELVE, NOT EVERY COLUMN, and that is deliberate. `createLead` accepts these
// twelve and nothing else; rendering an input for a column it does not read
// would be a field with no destination, which is the same parity failure in
// the opposite direction. The rest are set on the edit drawer, against
// `updateLead`, which does read them. The four social links are here because
// the contact rule counts them (#37): a lead with only a WhatsApp link must be
// creatable from this form.
export const CREATE_FIELD_NAMES = [
  "client_name",
  "email",
  "phone",
  "company",
  "website",
  "lead_source",
  "service_category",
  "social_google_business",
  "social_facebook",
  "social_instagram",
  "social_whatsapp",
  "estimated_revenue",
] as const;

type FieldName = (typeof CREATE_FIELD_NAMES)[number];
type Values = Record<FieldName, string>;

const EMPTY: Values = Object.fromEntries(CREATE_FIELD_NAMES.map((n) => [n, ""])) as Values;

// The create form's body, split out of CreateLeadDrawer for a mechanical
// reason rather than a tidiness one: a Radix Sheet mounts its content only
// while it is open, so a `useFormResetRestore` living in the drawer component
// would run its effect with `anchor.current === null` and silently attach no
// reset listener at all. Proven by a failing test - the numeric field came
// back empty after a form.reset() that every other field survived.
//
// Keeping the body here means the hook mounts with the form. It also means
// the typed values die with the drawer when it closes, which is exactly the
// behaviour the old "clear the values on success" effect had to arrange by
// hand.
export function CreateLeadForm({
  formAction,
  isPending,
  error,
  onCancel,
}: {
  formAction: (formData: FormData) => void;
  isPending: boolean;
  error?: string;
  onCancel: () => void;
}) {
  // CONTROLLED, not bare uncontrolled inputs, and that is load-bearing. React 19
  // resets a <form action={...}> after the action returns - including on
  // failure - by calling form.reset() on the element. Uncontrolled fields then
  // revert to their default, wiping every value right as the error tells the
  // operator to change one of them. The real triggers here are the
  // unique_tenant_client_email_ci collision and a lead with no Contact
  // Channel, which both return { error } and leave the drawer open. See CLAUDE.md § Form/Action Field Parity.
  const [values, setValues] = useState<Values>(EMPTY);
  // The number field needs this even though the text fields do not: React
  // restores a controlled text <input> after the post-action form.reset() on
  // its own, but an empty-able numeric one is not reliably restored without a
  // render. See the hook.
  const anchor = useRef<HTMLFormElement>(null);
  useFormResetRestore(anchor);

  const field = (name: FieldName) => ({
    name,
    value: values[name],
    onChange: (event: { target: { value: string } }) =>
      setValues((current) => ({ ...current, [name]: event.target.value })),
  });

  return (
    <form ref={anchor} action={formAction} className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
        {/* Every group is always open, unlike the edit drawer's. There is
            nothing rarely-touched on a create form, so collapsing one would
            hide something for no gain. */}
        <FormSection id="identity" label="Identity" count={7} collapsible={false}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Client name" {...field("client_name")} required />
            <Input label="Company" {...field("company")} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {/* Optional: a lead needs a name and any one Contact Channel,
                and createLead says so when there is none (#37). */}
            <Input label="Email" type="email" {...field("email")} />
            <Input label="Phone" {...field("phone")} />
          </div>
          {/* Full width: a URL runs past a half column and would truncate for
              no reason. */}
          <Input label="Website" {...field("website")} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Lead source" {...field("lead_source")} />
            <Input label="Service category" {...field("service_category")} />
          </div>
        </FormSection>

        <FormSection id="social" label="Social profiles" count={4} collapsible={false}>
          <Input label="Google Business Profile" {...field("social_google_business")} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Facebook" {...field("social_facebook")} />
            <Input label="Instagram" {...field("social_instagram")} />
          </div>
          <Input label="WhatsApp" {...field("social_whatsapp")} placeholder="https://wa.me/…" />
        </FormSection>

        <FormSection id="pipeline" label="Pipeline" count={1} collapsible={false}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Estimated revenue"
              {...field("estimated_revenue")}
              type="number"
              min="0"
              step="0.01"
            />
          </div>
        </FormSection>
      </div>

      {/* The pinned action bar, same as the edit drawer's: Save sits outside
          the scrolling element, so it is one click away from anywhere. */}
      <div className="flex shrink-0 flex-col gap-2 border-t border-hairline bg-canvas-pure px-4 py-3">
        {error && (
          <p className="text-body-sm rounded-xs border border-hairline bg-pill-orange-bg px-3 py-2 text-pill-orange-fg">
            {error}
          </p>
        )}
        <div className="flex items-center gap-2">
          <Button type="submit" variant="primary" loading={isPending}>
            {isPending ? "Creating…" : "Create lead"}
          </Button>
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </form>
  );
}
