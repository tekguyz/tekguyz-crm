import { createAdminClient, createAnonClient } from "./clients";

export const DEMO_ORG_NAME = "TEKGUYZ Demo";

// Disposable, internal-only owner account for the demo org — not a real
// person. It exists solely because create_organization_with_owner requires
// a real authenticated auth.uid() (see clients.ts), so something has to be
// able to sign in and call it. Fixed, known credentials so re-running these
// scripts is idempotent without persisting a generated password anywhere.
//
// Duplicated by hand in src/app/api/dev-login/route.ts, the dev-only sign-in
// shortcut. Change one, change the other — the route cannot import from here
// because this module pulls in the service-role client.
const DEMO_OWNER_EMAIL = "tekguyz.demo.owner@example.com";
const DEMO_OWNER_PASSWORD = "Tekguyz-Demo-Seed-Owner-2026!";

export async function ensureDemoOrg(): Promise<{ orgId: string; orgCreated: boolean }> {
  const admin = createAdminClient();

  const { data: existingOrg, error: lookupError } = await admin
    .from("organizations")
    .select("id")
    .eq("name", DEMO_ORG_NAME)
    .maybeSingle();

  if (lookupError) {
    throw new Error(`Failed to look up "${DEMO_ORG_NAME}": ${lookupError.message}`);
  }

  if (existingOrg) {
    return { orgId: existingOrg.id as string, orgCreated: false };
  }

  await ensureDemoOwnerUser(admin);

  const anon = createAnonClient();
  const { data: signInData, error: signInError } = await anon.auth.signInWithPassword({
    email: DEMO_OWNER_EMAIL,
    password: DEMO_OWNER_PASSWORD,
  });

  if (signInError || !signInData.session) {
    throw new Error(`Failed to sign in as demo owner: ${signInError?.message ?? "no session returned"}`);
  }

  // Same RPC real signup/onboarding uses — atomically creates the org and
  // makes the caller (the demo owner) its OWNER. Never a raw insert, so the
  // org can never end up without an owner (CLAUDE.md's standing rule).
  const { data: orgId, error: rpcError } = await anon.rpc("create_organization_with_owner", {
    p_name: DEMO_ORG_NAME,
  });

  await anon.auth.signOut();

  if (rpcError || !orgId) {
    throw new Error(`create_organization_with_owner failed: ${rpcError?.message ?? "no org id returned"}`);
  }

  return { orgId: orgId as string, orgCreated: true };
}

async function ensureDemoOwnerUser(admin: ReturnType<typeof createAdminClient>): Promise<void> {
  const { error } = await admin.auth.admin.createUser({
    email: DEMO_OWNER_EMAIL,
    password: DEMO_OWNER_PASSWORD,
    email_confirm: true, // pre-confirmed — no email sent, sidesteps Supabase's auth email rate limit entirely
    user_metadata: {
      seed_script: true,
      purpose: "TEKGUYZ Demo org owner — disposable, internal only, not a real user",
    },
  });

  if (error && !/already.*(registered|exists)/i.test(error.message)) {
    throw new Error(`Failed to create demo owner user: ${error.message}`);
  }
}
