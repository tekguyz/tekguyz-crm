// Runs the Supabase CLI against this project from any terminal: the Run
// button (PowerShell) and Git Bash alike.
//
//   npm run db:push                                push new migrations
//   npm run supabase -- migration list --linked    any other CLI command
//
// HOW IT REACHES THE DATABASE. `--linked` is swapped for
// `--db-url <SUPABASE_DB_URL from .env>`, so the database commands (db push,
// migration list/repair, db query) talk to Postgres directly and need no
// Supabase access token and no project link. A plain terminal's saved CLI login
// belongs to another Supabase account, and access tokens expire; the database
// URL in .env does neither. The URL is never printed.
//
// A command without `--linked` (projects list, link, …) still needs a token:
// SUPABASE_ACCESS_TOKEN under "env" in .claude/settings.local.json, passed
// through when present.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");

function readDbUrl(): string {
  for (const name of [".env.local", ".env"]) {
    const file = path.join(root, name);
    if (!existsSync(file)) continue;
    const match = readFileSync(file, "utf8").match(/^SUPABASE_DB_URL=\s*"?([^"\r\n]+)"?/m);
    if (match) return match[1].trim();
  }
  return "";
}

function readToken(): string {
  try {
    const file = path.join(root, ".claude/settings.local.json");
    return JSON.parse(readFileSync(file, "utf8"))?.env?.SUPABASE_ACCESS_TOKEN ?? "";
  } catch {
    return "";
  }
}

let args = process.argv.slice(2);
if (args.includes("--linked")) {
  const dbUrl = readDbUrl();
  if (!dbUrl) {
    console.error("SUPABASE_DB_URL is not in .env. Add this project's database connection string there.");
    process.exit(1);
  }
  args = args.flatMap((arg) => (arg === "--linked" ? ["--db-url", dbUrl] : [arg]));
}

const token = readToken();
const env = token ? { ...process.env, SUPABASE_ACCESS_TOKEN: token } : process.env;
const result = spawnSync("supabase", args, {
  stdio: "inherit",
  shell: process.platform === "win32",
  env,
  cwd: root,
});
process.exit(result.status ?? 1);
