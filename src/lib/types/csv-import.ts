// Shared vocabulary for the CSV import wizard. Field ids below are real
// `leads` column names, spelled exactly as the live schema spells them. That
// is also what makes a Muse Lead Pack auto-map with no clicks: its 13 headers
// are these ids. Only `client_name` is required. Email is optional here, as
// everywhere except the webhook; the contact rule (@/lib/leads/contact-rule)
// is checked per row, not per mapping.
export type ParsedCsvRow = Record<string, string>;

export type MappableField =
  | "client_name"
  | "company"
  | "email"
  | "phone"
  | "website"
  | "physical_address"
  | "service_category"
  | "estimated_revenue"
  | "lead_source"
  | "social_google_business"
  | "social_facebook"
  | "social_instagram"
  | "social_whatsapp"
  | "ai_brief"
  | "ignore";

export interface FieldDefinition {
  id: MappableField;
  label: string;
  required?: boolean;
}

export const MAPPABLE_FIELDS: FieldDefinition[] = [
  { id: "client_name", label: "Client Name", required: true },
  { id: "email", label: "Email" },
  { id: "company", label: "Company" },
  { id: "phone", label: "Phone" },
  { id: "website", label: "Website" },
  { id: "physical_address", label: "Physical Address" },
  { id: "service_category", label: "Service Category" },
  { id: "estimated_revenue", label: "Estimated Revenue" },
  { id: "lead_source", label: "Lead Source" },
  { id: "social_google_business", label: "Google Business Profile" },
  { id: "social_facebook", label: "Facebook" },
  { id: "social_instagram", label: "Instagram" },
  { id: "social_whatsapp", label: "WhatsApp" },
  { id: "ai_brief", label: "AI Brief" },
];

export type ColumnMapping = Record<string, MappableField>;

export type WizardStep = "upload" | "map" | "validate" | "summary";

export const MAX_IMPORT_ROWS = 1000;

export interface ParsedCsvFile {
  fileName: string;
  headers: string[];
  rows: ParsedCsvRow[];
}

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

// Common header spellings that don't normalize onto a field id or its label.
const FIELD_ALIASES: Record<string, MappableField> = {
  name: "client_name",
  fullname: "client_name",
  contactname: "client_name",
  contact: "client_name",
  emailaddress: "email",
  phonenumber: "phone",
  mobile: "phone",
  telephone: "phone",
  companyname: "company",
  businessname: "company",
  url: "website",
  address: "physical_address",
  streetaddress: "physical_address",
  service: "service_category",
  category: "service_category",
  revenue: "estimated_revenue",
  estimatedvalue: "estimated_revenue",
  value: "estimated_revenue",
  source: "lead_source",
  leadsource: "lead_source",
};

// Exact normalized matches only — no fuzzy scoring. A wrong guess costs the
// user a correction they may not notice, so this only fires when the header
// is unambiguous, and never assigns the same field twice (which would land
// the user on a duplicate-mapping error they didn't create).
export function guessMapping(headers: string[]): ColumnMapping {
  const taken = new Set<MappableField>();

  return headers.reduce<ColumnMapping>((mapping, header) => {
    const key = normalize(header);
    const match =
      MAPPABLE_FIELDS.find((field) => normalize(field.id) === key || normalize(field.label) === key)
        ?.id ?? FIELD_ALIASES[key];

    if (match && !taken.has(match)) {
      taken.add(match);
      mapping[header] = match;
    } else {
      mapping[header] = "ignore";
    }
    return mapping;
  }, {});
}
