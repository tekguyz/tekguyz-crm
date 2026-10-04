import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// The two Supabase Auth emails this app sends (signUp confirmation and
// resetPasswordForEmail), in the CRM's own look. Their HOSTED copies are set
// by `npm run auth:emails`; this checks the repo copies those come from.
// claude-config#41.

const ROOT = path.resolve(import.meta.dirname, "../../..");
// CRLF on these Windows checkouts (core.autocrlf), LF everywhere else.
const toml = readFileSync(path.join(ROOT, "supabase/config.toml"), "utf8").replace(/\r\n/g, "\n");

/** The flat `key = value` lines of one [section]. Not a TOML parser. */
function section(name: string): Record<string, string> {
  const start = toml.indexOf(`\n[${name}]\n`);
  expect(start, `[${name}] missing from config.toml`).toBeGreaterThan(-1);
  const body = toml.slice(start + name.length + 4).split(/\n\[/)[0];
  return Object.fromEntries(
    body
      .split("\n")
      .filter((l) => /^\w+\s*=/.test(l))
      .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
  );
}

const minutes = Number(section("auth.email").otp_expiry) / 60;

describe("auth email templates", () => {
  for (const template of ["confirmation", "recovery"]) {
    it(`${template}: names the app, keeps the working link, states the real lifetime`, () => {
      const entry = section(`auth.email.template.${template}`);
      expect(JSON.parse(entry.subject) as string).toContain("TEKGUYZ CRM");
      const html = readFileSync(path.join(ROOT, JSON.parse(entry.content_path) as string), "utf8");
      // The link this app's /auth/confirm already handles: Supabase verifies,
      // then redirects with ?code=. redirectTo carries ?next=, so a
      // hand-built "{{ .RedirectTo }}?token_hash=" link would break it.
      expect(html).toContain('href="{{ .ConfirmationURL }}"');
      expect(html).not.toContain("token_hash");
      expect(html).toContain(`${minutes} minutes`);
      expect(html).toContain("TEKGUYZ CRM");
    });
  }
});
