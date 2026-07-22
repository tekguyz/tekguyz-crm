import { z } from "zod";

// Both fields optional — an org may configure only one provider. Deliberately
// scoped to Gemini and Anthropic only; api_key_openai/token_resend/token_twilio
// stay unused in the schema until there's an actual need for them.
export const credentialsFormSchema = z.object({
  api_key_gemini: z.string().trim().optional(),
  api_key_anthropic: z.string().trim().optional(),
});

export type CredentialsFormInput = z.infer<typeof credentialsFormSchema>;
