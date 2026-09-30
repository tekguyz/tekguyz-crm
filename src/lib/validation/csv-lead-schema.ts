import { z } from "zod";
import { hasContactChannel, NO_CONTACT_CHANNEL_MESSAGE } from "@/lib/leads/contact-rule";

// Spreadsheets export currency as "$1,250.00" far more often than "1250" —
// stripping the symbols is data hygiene, not leniency: anything that still
// isn't a number after this fails the refine below rather than silently
// becoming 0.
const parseRevenue = (value: string) => Number(value.replace(/[$,\s]/g, ""));

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value && value.length > 0 ? value : null));

// Mirrors the live `leads` constraints. client_name is required. email is
// optional, and blank is NULL, never '' (check_lead_email_not_blank). The row
// must still have one Contact Channel (check_lead_has_contact_channel), which
// the superRefine below checks. estimated_revenue is NOT NULL with a 0.00
// default, hence the fallback rather than a required value.
//
// Junk link and email cells never reach this schema: validateRows empties them
// first (@/lib/import/channel-cells), so a leftover invalid email here means a
// caller skipped that step.
export const csvLeadSchema = z
  .object({
    client_name: z.string().trim().min(1, "Client name is required"),
    // Lowercased before anything else sees it, so the stored value agrees with
    // the case-insensitive unique_tenant_client_email_ci index and with
    // public.lead_key_email.
    email: z
      .string()
      .trim()
      .toLowerCase()
      .optional()
      .transform((value) => (value && value.length > 0 ? value : null))
      .pipe(z.email("Must be a valid email address").nullable()),
    company: optionalText,
    phone: optionalText,
    website: optionalText,
    physical_address: optionalText,
    service_category: optionalText,
    lead_source: optionalText,
    social_google_business: optionalText,
    social_facebook: optionalText,
    social_instagram: optionalText,
    social_whatsapp: optionalText,
    ai_brief: optionalText,
    estimated_revenue: z
      .string()
      .trim()
      .optional()
      .transform((value) => (value && value.length > 0 ? parseRevenue(value) : 0))
      .refine((value) => Number.isFinite(value), "Estimated revenue must be a number")
      // The database happily stores a negative NUMERIC; a negative estimated
      // revenue is always a data-entry error, so it's caught here instead.
      // Passes non-finite values through so a garbage cell reports one error
      // ("must be a number") rather than two.
      .refine((value) => !Number.isFinite(value) || value >= 0, "Estimated revenue can't be negative"),
  })
  .refine(hasContactChannel, NO_CONTACT_CHANNEL_MESSAGE);

export type ValidatedRow = z.infer<typeof csvLeadSchema>;

const optionalTextOut = z.string().trim().min(1).nullable().catch(null);

// The server-side re-check. This exists because `csvLeadSchema` is NOT
// idempotent: it parses raw CSV *strings* into a typed shape (numbers,
// nulls), so feeding its own output back through it fails every row. The
// client sends `ValidatedRow` over the wire, so the re-check has to validate
// that shape instead. Enforces the same rules — non-empty name, a valid
// lowercased email or none, one Contact Channel, non-negative finite revenue —
// on data the server must not trust just because the client claims it
// already passed.
//
// That this yields exactly a ValidatedRow is enforced at compile time by
// batchInsertLeads pushing its output into a ValidatedRow[] — no separate
// type assertion needed here.
export const validatedRowSchema = z
  .object({
    client_name: z.string().trim().min(1, "Client name is required"),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .nullish()
      .transform((value) => (value ? value : null))
      .pipe(z.email("Must be a valid email address").nullable()),
    company: optionalTextOut,
    phone: optionalTextOut,
    website: optionalTextOut,
    physical_address: optionalTextOut,
    service_category: optionalTextOut,
    lead_source: optionalTextOut,
    social_google_business: optionalTextOut,
    social_facebook: optionalTextOut,
    social_instagram: optionalTextOut,
    social_whatsapp: optionalTextOut,
    ai_brief: optionalTextOut,
    estimated_revenue: z
      .number()
      .refine((value) => Number.isFinite(value), "Estimated revenue must be a number")
      .refine((value) => value >= 0, "Estimated revenue can't be negative"),
  })
  .refine(hasContactChannel, NO_CONTACT_CHANNEL_MESSAGE);
