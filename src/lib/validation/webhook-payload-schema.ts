import { z } from "zod";

// Intentionally permissive on optional fields — external form/Zapier
// payloads vary in shape, and the only two fields this app cannot function
// without are client_name and a valid email.
export const webhookPayloadSchema = z.object({
  client_name: z.string().trim().min(1, "client_name is required"),
  // Lowercased here, same chain shape as csv-lead-schema.ts's csvLeadSchema —
  // this is the single normalization point; ingest-lead.ts's lookup and
  // insert both trust payload.email is already lowercase by the time they
  // run, rather than re-normalizing.
  email: z.string().trim().toLowerCase().email("a valid email is required"),
  phone: z.string().trim().optional(),
  company: z.string().trim().optional(),
  website: z.string().trim().optional(),
  physical_address: z.string().trim().optional(),
  service_category: z.string().trim().optional(),
  lead_source: z.string().trim().optional(),
  message: z.string().trim().optional(),
});

export type ValidatedWebhookPayload = z.infer<typeof webhookPayloadSchema>;
