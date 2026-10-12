import { z } from "zod";

// Minimum length only, matching this project's Supabase policy (10, read from
// the auth config 2026-10-11). Supabase's character-class requirements are the
// real boundary and surface their own error message via updateUser().
export const resetPasswordSchema = z
  .object({
    password: z.string().min(10, "Password must be at least 10 characters."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });
