// Runs the Supabase CLI with this project's own access token, so it works
// from any terminal: the Run button (PowerShell) and Git Bash alike.
//
//   npm run db:push                     push new migrations
//   npm run supabase -- migration list  any other CLI command
//
// The token is SUPABASE_ACCESS_TOKEN under "env" in .claude/settings.local.json
// (not in git). Claude Code reads that file; a plain terminal does not, so
// without this the CLI falls back to the saved login, which belongs to another
// Supabase account and gets "401 Unauthorized".
//
// The project link (supabase/.temp) is not in git either, so a fresh checkout
// or the other laptop has none. The first run links it, using the project ref
// in NEXT_PUBLIC_SUPABASE_URL from .env — one source for which project this is.
//
// Same script as tekguyz-command/scripts/supabase.ts, plus the auto-link.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");

function readToken(): string {
  const file = path.join(root, ".claude/settings.local.json");
  try {
    return JSON.parse(readFileSync(file, "utf8"))?.env?.SUPABASE_ACCESS_TOKEN ?? "";
  } catch {
    return "";
  }
}

function readProjectRef(): string {
  for (const name of [".env", ".env.local"]) {
    const file = path.join(root, name);
    if (!existsSync(file)) continue;
    const match = readFileSync(file, "utf8").match(/^NEXT_PUBLIC_SUPABASE_URL=\s*"?https:\/\/([a-z0-9]+)\.supabase\.co/m);
    if (match) return match[1];
  }
  return "";
}

const token = readToken();
if (!token) {
  console.error('No SUPABASE_ACCESS_TOKEN under "env" in .claude/settings.local.json. Add this project\'s token there.');
  process.exit(1);
}

const env = { ...process.env, SUPABASE_ACCESS_TOKEN: token };
const run = (args: string[]) =>
  spawnSync("supabase", args, { stdio: "inherit", shell: process.platform === "win32", env, cwd: root });

if (!existsSync(path.join(root, "supabase/.temp/project-ref"))) {
  const ref = readProjectRef();
  if (!ref) {
    console.error("This checkout is not linked, and NEXT_PUBLIC_SUPABASE_URL is not in .env to link it.");
    process.exit(1);
  }
  console.log(`Linking this checkout to Supabase project ${ref}...`);
  const linked = run(["link", "--project-ref", ref]);
  if (linked.status !== 0) process.exit(linked.status ?? 1);
}

const result = run(process.argv.slice(2));
process.exit(result.status ?? 1);
