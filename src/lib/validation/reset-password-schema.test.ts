import { describe, expect, it } from "vitest";
import { resetPasswordSchema } from "./reset-password-schema";

describe("resetPasswordSchema", () => {
  it("rejects a password under 10 characters (the project's Supabase minimum)", () => {
    const result = resetPasswordSchema.safeParse({
      password: "Abcdef1!x",
      confirmPassword: "Abcdef1!x",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("Password must be at least 10 characters.");
  });

  it("accepts a 10-character password that matches its confirmation", () => {
    const result = resetPasswordSchema.safeParse({
      password: "Abcdef1!xy",
      confirmPassword: "Abcdef1!xy",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a confirmation that does not match", () => {
    const result = resetPasswordSchema.safeParse({
      password: "Abcdef1!xy",
      confirmPassword: "Abcdef1!xz",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("Passwords do not match.");
  });
});
