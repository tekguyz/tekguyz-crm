import type { NewLeadInput } from "@/lib/leads/create";

// The Promote form's field set, in one place, as data.
//
// This constant is the whole reason field parity is testable here rather than
// by eye. buildPromotePayload below reads EXACTLY these names and nothing else,
// and PromoteProspectModal renders EXACTLY these names and nothing else — so a
// single test can diff the rendered form against the action's reads in both
// directions and fail if either side drifts. That is the mechanical version of
// CLAUDE.md § Form/Action Field Parity, which has already cost this project
// five silently-NULLed leads columns across two incidents.
export const PROMOTE_FIELD_NAMES = [
  "prospect_id",
  "client_name",
  "email",
  "phone",
  "company",
  "website",
  "physical_address",
  "service_category",
  "lead_source",
  "estimated_revenue",
  "message",
] as const;

export type PromoteFieldName = (typeof PROMOTE_FIELD_NAMES)[number];

export type PromotePayload = {
  prospectId: string;
  lead: NewLeadInput;
};

export type PromotePayloadResult =
  | { ok: true; payload: PromotePayload }
  | { ok: false; error: string };

// An untouched text input posts "" rather than null, and both must store as
// NULL — never a default. CLAUDE.md is explicit that a default is worse than
// `|| null`, because a default is itself valid and so passes validation while
// quietly resetting a column.
function optional(value: FormDataEntryValue | null): string | null {
  const text = typeof value === "string" ? value.trim() : "";
  return text || null;
}

function required(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

export function buildPromotePayload(formData: FormData): PromotePayloadResult {
  const prospectId = required(formData.get("prospect_id"));
  const clientName = required(formData.get("client_name"));
  // Lowercased here, exactly as createLead does, so this path matches the DB's
  // case-insensitive unique_tenant_client_email_ci and every other lead-origin
  // path. insertLeadWithSubmission deliberately does NOT re-lowercase, so this
  // is the only place it happens for this form.
  const email = required(formData.get("email")).toLowerCase();

  if (!prospectId) {
    return { ok: false, error: "Missing prospect." };
  }
  if (!clientName || !email) {
    return { ok: false, error: "Contact name and email are required." };
  }

  const estimatedRevenueRaw = formData.get("estimated_revenue");
  const estimatedRevenue = estimatedRevenueRaw ? Number(estimatedRevenueRaw) : 0;
  if (!Number.isFinite(estimatedRevenue) || estimatedRevenue < 0) {
    return { ok: false, error: "Estimated revenue must be a positive number." };
  }

  return {
    ok: true,
    payload: {
      prospectId,
      lead: {
        clientName,
        email,
        phone: optional(formData.get("phone")),
        company: optional(formData.get("company")),
        website: optional(formData.get("website")),
        physicalAddress: optional(formData.get("physical_address")),
        serviceCategory: optional(formData.get("service_category")),
        leadSource: optional(formData.get("lead_source")),
        estimatedRevenue,
        // Unlike createLead, this path DOES have a real message: whatever the
        // operator learned on the call. It becomes the lead_submissions row's
        // message, which is the honest place for it — the submission is the
        // immutable record of the enquiry, and a cold call IS the enquiry here.
        message: optional(formData.get("message")),
      },
    },
  };
}

// ---------------------------------------------------------------------------
// The other half of the same contract: what the form is PRE-FILLED with.
//
// Kept in this file on purpose. Parity is a property of the pair — anyone
// checking that the modal, the defaults and the action agree wants all three
// facts in one place, not spread across siblings where no single file shows
// the field set. That split is exactly what hid the NULL-on-save bug twice.
// ---------------------------------------------------------------------------

export type PromoteDefaultsSource = {
  id: string;
  name: string;
  category: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  phone: string | null;
  website_url: string | null;
  notes: string | null;
};

export type PromoteDefaults = Record<PromoteFieldName, string>;

// "123 Main St, Fort Worth, TX 76102" from four nullable parts, skipping every
// missing one so a mobile-only business with no street address does not get a
// value starting with a comma. Returns "" when nothing is known, which the
// form renders as an empty editable field rather than a fake address.
export function composeAddress(source: PromoteDefaultsSource): string {
  const stateAndPostal = [source.state, source.postal_code].filter(Boolean).join(" ");
  return [source.address, source.city, stateAndPostal]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(", ");
}

// The lead_source written for every promoted prospect. A constant, not typed
// per promotion: "where did this come from" is a fact about the pipeline, and
// letting it vary by operator mood makes it useless for reporting later. The
// field stays editable in the form, so an operator who genuinely knows better
// can still say so.
export const PROMOTED_LEAD_SOURCE = "Cold outreach — Google Business Profile";

export function prospectToPromoteDefaults(source: PromoteDefaultsSource): PromoteDefaults {
  return {
    prospect_id: source.id,
    // Both prefill from the business name, and both are editable. The operator
    // overwrites client_name with the person they actually spoke to; until they
    // do, the business name is a far more useful display value than a blank
    // required field that blocks the form.
    client_name: source.name,
    company: source.name,
    // The one field a prospect can never supply — Google Business Profile does
    // not expose an email, which is the entire reason prospects is a separate
    // table from leads. Getting one is what the call is for.
    email: "",
    phone: source.phone ?? "",
    website: source.website_url ?? "",
    physical_address: composeAddress(source),
    service_category: source.category ?? "",
    lead_source: PROMOTED_LEAD_SOURCE,
    estimated_revenue: "",
    // Carried over from the prospect's call notes, then editable. This becomes
    // the lead_submissions row's message.
    message: source.notes ?? "",
  };
}
