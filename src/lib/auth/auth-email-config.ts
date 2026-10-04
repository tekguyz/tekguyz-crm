// What the HOSTED Auth config must hold for this app's two emails (signUp
// confirmation, resetPasswordForEmail) to go out through Resend, from
// tekguyz.com, in the CRM's own look. Pure: scripts/auth-emails.mts does the
// reading and the network. claude-config#41.
//
// Plain TypeScript with no `@/` imports, so plain Node can import it.

export const SENDER = { name: "TEKGUYZ CRM", email: "no-reply@tekguyz.com" } as const;

/** Resend's SMTP door. The password is a Resend API key. */
const RESEND_SMTP = { smtp_host: "smtp.resend.com", smtp_port: "465", smtp_user: "resend" } as const;

/** Supabase's built-in mailer allows 2 an hour; with custom SMTP the cap is ours. Same as the other apps. */
const EMAILS_PER_HOUR = 30;

const TEMPLATES = ["confirmation", "recovery"] as const;
export type TemplateName = (typeof TEMPLATES)[number];

export type TemplateSection = { name: TemplateName; subject: string; contentPath: string };
export type Template = { name: TemplateName; subject: string; html: string };

/** The subject and file of each template, from supabase/config.toml. Not a TOML parser: flat `key = "value"` lines only. */
export function readTemplateSections(toml: string): TemplateSection[] {
  const text = toml.replace(/\r\n/g, "\n");
  return TEMPLATES.map((name) => {
    const header = `[auth.email.template.${name}]\n`;
    const start = text.indexOf(header);
    if (start === -1) throw new Error(`[auth.email.template.${name}] is missing from supabase/config.toml`);
    const body = text.slice(start + header.length).split(/\n\[/)[0];
    const value = (key: string) => {
      const match = body.match(new RegExp(`^${key}\\s*=\\s*"([^"]*)"`, "m"));
      if (!match) throw new Error(`[auth.email.template.${name}] has no ${key}`);
      return match[1];
    };
    return { name, subject: value("subject"), contentPath: value("content_path") };
  });
}

/** Every hosted field this app sets. Custom templates need custom SMTP, so they go up together. */
export function wantedAuthConfig(templates: Template[], resendKey: string): Record<string, string | number> {
  const wanted: Record<string, string | number> = {
    ...RESEND_SMTP,
    smtp_pass: resendKey,
    smtp_admin_email: SENDER.email,
    smtp_sender_name: SENDER.name,
    rate_limit_email_sent: EMAILS_PER_HOUR,
  };
  for (const t of templates) {
    wanted[`mailer_subjects_${t.name}`] = t.subject;
    wanted[`mailer_templates_${t.name}_content`] = t.html;
  }
  return wanted;
}

/** The fields to send. The password is always sent: the API never returns it as set. */
export function changedKeys(current: Record<string, unknown>, wanted: Record<string, unknown>): string[] {
  return Object.keys(wanted).filter((key) => key === "smtp_pass" || String(current[key] ?? "") !== String(wanted[key]));
}

/** A value safe to print: never the password, never a whole template. */
export function shown(key: string, value: unknown): string {
  if (key === "smtp_pass") return "(set, hidden)";
  if (key.endsWith("_content")) return `(${String(value).length} chars)`;
  return JSON.stringify(value);
}
