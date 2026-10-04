// Puts this app's two Auth emails on the hosted project, sent through Resend
// from no-reply@tekguyz.com as "TEKGUYZ CRM". Safe to run again.
//
//   npm run auth:emails -- --dry-run   show what would change, send nothing
//   npm run auth:emails                apply
//
// Templates and subjects come from supabase/config.toml and the files it
// names (src/lib/auth/auth-email-templates.test.ts checks them). Only the Auth
// email fields change, through the management API. Never `supabase config
// push`: it would also push the local site_url over production.
//
// Needs SUPABASE_ACCESS_TOKEN under "env" in .claude/settings.local.json and
// PLATFORM_RESEND_API_KEY in .env (the SMTP password). Neither is printed.
// claude-config#41.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  changedKeys,
  readTemplateSections,
  shown,
  wantedAuthConfig,
} from "../src/lib/auth/auth-email-config.ts";

const PROJECT_REF = "hpouehfybzkarekdhawg";
const API = `https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`;
const root = path.resolve(import.meta.dirname, "..");
const dryRun = process.argv.includes("--dry-run");

// Exit codes: 0 done (or dry run), 2 could not run. process.exit() right after
// a fetch crashes Node on Windows (libuv UV_HANDLE_CLOSING), so this sets
// process.exitCode and returns instead.
class Stop extends Error {}
function fail(message: string): never {
  console.error(`auth-emails: ${message}`);
  process.exitCode = 2;
  throw new Stop();
}

function readToken(): string {
  try {
    return JSON.parse(readFileSync(path.join(root, ".claude/settings.local.json"), "utf8"))?.env?.SUPABASE_ACCESS_TOKEN ?? "";
  } catch {
    return "";
  }
}

function readResendKey(): string {
  for (const name of [".env.local", ".env"]) {
    const file = path.join(root, name);
    if (!existsSync(file)) continue;
    const match = readFileSync(file, "utf8").match(/^PLATFORM_RESEND_API_KEY=\s*"?([^"\r\n]+)"?/m);
    if (match) return match[1].trim();
  }
  return "";
}

async function main(): Promise<void> {
  const token = readToken();
  if (!token) fail("no SUPABASE_ACCESS_TOKEN under env in .claude/settings.local.json.");
  const resendKey = readResendKey();
  if (!resendKey) fail("no PLATFORM_RESEND_API_KEY in .env.");

  const templates = readTemplateSections(readFileSync(path.join(root, "supabase/config.toml"), "utf8")).map((t) => ({
    name: t.name,
    subject: t.subject,
    html: readFileSync(path.join(root, t.contentPath), "utf8").replace(/\r\n/g, "\n"),
  }));
  const wanted = wantedAuthConfig(templates, resendKey);
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const before = await fetch(API, { headers });
  if (!before.ok) fail(`reading the hosted config failed: HTTP ${before.status}.`);
  const current = (await before.json()) as Record<string, unknown>;

  const keys = changedKeys(current, wanted);
  for (const key of keys) console.log(`${dryRun ? "would set" : "set"} ${key} = ${shown(key, wanted[key])}`);
  if (dryRun) return;

  const patch = Object.fromEntries(keys.map((key) => [key, wanted[key]]));
  const after = await fetch(API, { method: "PATCH", headers, body: JSON.stringify(patch) });
  if (!after.ok) fail(`the update failed: HTTP ${after.status} ${(await after.text()).slice(0, 300)}`);

  const left = changedKeys((await after.json()) as Record<string, unknown>, wanted).filter((key) => key !== "smtp_pass");
  if (left.length) fail(`the hosted config still differs in: ${left.join(", ")}.`);
  console.log("auth-emails: done. The hosted Auth emails match the repo.");
}

await main().catch((error: unknown) => {
  if (!(error instanceof Stop)) throw error;
});
