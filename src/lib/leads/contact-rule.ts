// The contact rule (#37, CONTEXT.md § Leads): a lead needs a name and at least
// one non-blank Contact Channel. Email is only one of them, and is required
// only on the website's contact form (the webhook), never anywhere else.
//
// The database enforces this with check_lead_has_contact_channel
// (20260930120000_muse_lead_pack.sql). This copy exists so the CSV import and
// the lead forms can tell the user why, instead of surfacing a CHECK error.
// Change both together.

export const CONTACT_CHANNEL_FIELDS = [
  "email",
  "phone",
  "website",
  "social_facebook",
  "social_instagram",
  "social_whatsapp",
  "social_google_business",
] as const;

export type ContactChannelField = (typeof CONTACT_CHANNEL_FIELDS)[number];

export const NO_CONTACT_CHANNEL_MESSAGE =
  "Add at least one way to reach this lead: email, phone, website, Facebook, Instagram, WhatsApp or Google.";

export function hasContactChannel(
  values: Partial<Record<ContactChannelField, string | null | undefined>>,
): boolean {
  return CONTACT_CHANNEL_FIELDS.some((field) => {
    const value = values[field];
    return typeof value === "string" && value.trim() !== "";
  });
}
