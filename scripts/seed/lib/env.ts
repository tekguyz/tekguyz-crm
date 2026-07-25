export type SeedEnv = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceKey: string;
};

// Standalone scripts run outside Next.js, so .env isn't auto-loaded — the
// npm scripts that invoke these files pass `--env-file=.env` to tsx/node
// (Node 20.6+) instead. This just validates what actually landed.
export function loadSeedEnv(): SeedEnv {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY;

  const missing = [
    !supabaseUrl && "NEXT_PUBLIC_SUPABASE_URL",
    !supabaseAnonKey && "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    !supabaseServiceKey && "SUPABASE_SECRET_KEY",
  ].filter((v): v is string => Boolean(v));

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable(s): ${missing.join(", ")}. ` +
        `Run via the npm scripts (e.g. \`npm run seed:demo\`), which load .env for you.`,
    );
  }

  return {
    supabaseUrl: supabaseUrl!,
    supabaseAnonKey: supabaseAnonKey!,
    supabaseServiceKey: supabaseServiceKey!,
  };
}
