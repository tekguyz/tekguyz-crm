import "server-only";

type RequiredEnvVar = {
  name: string;
  description: string;
};

// Every var here is asserted present *and* non-empty at boot. Missing any of
// these must fail loudly and immediately — a silent fallback (like the
// "?? http://localhost:3000" defaults in notify-new-lead.ts and
// send-weekly-report.ts) is exactly how this build's real incidents
// surfaced: not as a boot failure, but as a broken link in a live email
// days later.
//
// NEXT_PUBLIC_APP_URL is this app's single public-origin var — a second,
// differently-named var (NEXT_PUBLIC_SITE_URL) used to exist solely for
// src/lib/auth/actions.ts's signup email redirect, but it was never a
// genuinely separate concept (no second "site" exists in this codebase) and
// was consolidated into this one in Prompt 15a's follow-up. Do not
// reintroduce a second app-URL var without a real reason one is needed.
const REQUIRED_ENV_VARS: RequiredEnvVar[] = [
  { name: "NEXT_PUBLIC_SUPABASE_URL", description: "Supabase project URL" },
  { name: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", description: "Supabase publishable (anon) key" },
  { name: "SUPABASE_SECRET_KEY", description: "Supabase service-role key, used by server-only clients" },
  { name: "PLATFORM_GEMINI_API_KEY", description: "Platform-wide fallback Gemini API key" },
  { name: "PLATFORM_RESEND_API_KEY", description: "Platform-wide fallback Resend API key" },
  { name: "CRON_SECRET", description: "Bearer secret gating /api/cron/* routes" },
  { name: "NEXT_PUBLIC_APP_URL", description: "Public app URL used in notification/report email deep links" },
];

export class MissingEnvVarError extends Error {
  constructor(missing: string[]) {
    super(
      `Missing required environment variable(s): ${missing.join(", ")}. ` +
        "Set these in .env for local development, and in every Vercel environment scope " +
        "this project actually deploys to (Production and Preview have held different " +
        "values for the same var name in this project before — see CLAUDE.md).",
    );
    this.name = "MissingEnvVarError";
  }
}

// Called once at boot from src/instrumentation.ts. Throws synchronously so a
// misconfigured deployment fails at startup with a specific, named error
// instead of an unrelated crash the first time the missing var is actually
// read mid-request (e.g. a webhook 500ing on `undefined`, or a cron silently
// no-op'ing because Resend's client rejected an empty key).
export function validateEnv(): void {
  const missing = REQUIRED_ENV_VARS.filter(({ name }) => !process.env[name]?.trim()).map(
    ({ name, description }) => `${name} (${description})`,
  );

  if (missing.length > 0) {
    throw new MissingEnvVarError(missing);
  }
}
