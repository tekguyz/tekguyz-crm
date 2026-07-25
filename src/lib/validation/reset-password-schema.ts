import { z } from "zod";

// Minimum length only — Supabase's own project-level password strength rule
// (character-class requirements) is the real boundary and surfaces its own
// error message via updateUser(); duplicating that exact rule here would
// just drift out of sync with it over time.
export const resetPasswordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });
