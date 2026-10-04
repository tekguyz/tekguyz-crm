import { describe, expect, it } from "vitest";
import {
  SENDER,
  changedKeys,
  readTemplateSections,
  shown,
  wantedAuthConfig,
} from "./auth-email-config";

// The pure half of `npm run auth:emails` (scripts/auth-emails.mts): what the
// hosted Auth config must hold for this app's two emails to go out through
// Resend in the CRM's own look. claude-config#41.

const TOML = [
  "[auth.email]",
  "otp_expiry = 3600",
  "",
  "[auth.email.template.confirmation]",
  'subject = "Confirm your TEKGUYZ CRM account"',
  'content_path = "./supabase/templates/confirmation.html"',
  "",
  "[auth.email.template.recovery]",
  'subject = "Reset your TEKGUYZ CRM password"',
  'content_path = "./supabase/templates/recovery.html"',
  "",
].join("\r\n");

describe("readTemplateSections", () => {
  it("reads both templates' subject and file, CRLF or not", () => {
    expect(readTemplateSections(TOML)).toEqual([
      { name: "confirmation", subject: "Confirm your TEKGUYZ CRM account", contentPath: "./supabase/templates/confirmation.html" },
      { name: "recovery", subject: "Reset your TEKGUYZ CRM password", contentPath: "./supabase/templates/recovery.html" },
    ]);
  });

  it("fails loudly when a template is missing", () => {
    expect(() => readTemplateSections("[auth.email]\notp_expiry = 3600\n")).toThrow(/confirmation/);
  });
});

describe("wantedAuthConfig", () => {
  const templates = [
    { name: "confirmation" as const, subject: "C", html: "<p>c</p>" },
    { name: "recovery" as const, subject: "R", html: "<p>r</p>" },
  ];

  it("sends through Resend from tekguyz.com under the app's name, with both templates", () => {
    expect(wantedAuthConfig(templates, "re_secret")).toEqual({
      smtp_host: "smtp.resend.com",
      smtp_port: "465",
      smtp_user: "resend",
      smtp_pass: "re_secret",
      smtp_admin_email: SENDER.email,
      smtp_sender_name: SENDER.name,
      rate_limit_email_sent: 30,
      mailer_subjects_confirmation: "C",
      mailer_templates_confirmation_content: "<p>c</p>",
      mailer_subjects_recovery: "R",
      mailer_templates_recovery_content: "<p>r</p>",
    });
    expect(SENDER).toEqual({ name: "TEKGUYZ CRM", email: "no-reply@tekguyz.com" });
  });
});

describe("changedKeys", () => {
  it("lists only what differs, and always the password, which cannot be compared", () => {
    const current = { smtp_host: "smtp.resend.com", smtp_port: "465", smtp_pass: "******" };
    const wanted = { smtp_host: "smtp.resend.com", smtp_port: "587", smtp_pass: "re_x" };
    expect(changedKeys(current, wanted)).toEqual(["smtp_port", "smtp_pass"]);
  });

  it("treats a number and its string as equal (the API returns ports as text)", () => {
    expect(changedKeys({ rate_limit_email_sent: "30" }, { rate_limit_email_sent: 30 })).toEqual([]);
  });
});

describe("shown", () => {
  it("never shows the password", () => {
    expect(shown("smtp_pass", "re_secret")).toBe("(set, hidden)");
  });

  it("shortens a template body to its length", () => {
    expect(shown("mailer_templates_recovery_content", "x".repeat(3800))).toBe("(3800 chars)");
  });

  it("shows plain values as they are", () => {
    expect(shown("smtp_sender_name", "TEKGUYZ CRM")).toBe('"TEKGUYZ CRM"');
  });
});
