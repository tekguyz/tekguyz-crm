import { createAdminClient } from "./clients";

// The public demo identity. Distinct from tekguyz.demo.owner@example.com in
// demo-org.ts, which stays OWNER and is untouched: an OWNER can read
// webhook_secret and change org settings, which a stranger must never do.
//
// This account holds role 'MEMBER' in organization_members — that column is
// about tenant permissions and is deliberately unchanged. Its inability to
// write comes from somewhere else entirely: the demo_readonly Postgres role
// in its JWT, which holds SELECT and nothing else (migration
// 20260904120000_demo_readonly_role.sql). Verified live after that migration
// applied: demo_readonly holds zero INSERT/UPDATE/DELETE privileges on any
// table, and EXECUTE on exactly one function, private.current_org_ids.
//
// Credentials come from the environment, never from source, matching how
// PLATFORM_RESEND_API_KEY and PLATFORM_GEMINI_API_KEY are handled.
const DB_ROLE = "demo_readonly";

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `${name} is not set. Add it to .env and to every Vercel environment scope this project deploys to.`,
    );
  }
  return value;
}

export async function ensureDemoVisitor(orgId: string): Promise<{ userId: string; created: boolean }> {
  const email = requireEnv("DEMO_VISITOR_EMAIL");
  const password = requireEnv("DEMO_VISITOR_PASSWORD");
  const admin = createAdminClient();

  let userId: string | null = null;
  let created = false;

  const { data: createdUser, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // pre-confirmed — no email sent, sidesteps the auth rate limit
    user_metadata: {
      seed_script: true,
      purpose: "Public read-only demo visitor — powerless by grant, not by UI",
    },
  });

  if (createdUser?.user) {
    userId = createdUser.user.id;
    created = true;
  } else if (createError && /already.*(registered|exists)/i.test(createError.message)) {
    const { data: list, error: listError } = await admin.auth.admin.listUsers();
    if (listError) throw new Error(`Failed to list users: ${listError.message}`);
    userId = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())?.id ?? null;
    if (!userId) throw new Error(`${email} reported as existing but was not found in listUsers.`);
  } else {
    throw new Error(`Failed to create demo visitor: ${createError?.message}`);
  }

  // The whole mechanism. GoTrue copies auth.users.role into the JWT's `role`
  // claim, and PostgREST does `set local role <that claim>` — so this one call
  // is what makes every write fail with "permission denied for table ...".
  //
  // Also re-asserts the password, so rotating DEMO_VISITOR_PASSWORD in the
  // environment and re-running the seed is all it takes to rotate the demo
  // credential. Both are re-applied on every run, not only on creation, so a
  // manual change in the Supabase dashboard cannot silently leave the account
  // writable or leave the deployed password stale.
  const { error: roleError } = await admin.auth.admin.updateUserById(userId, {
    password,
    role: DB_ROLE,
  } as { password: string; role: string });
  if (roleError) {
    throw new Error(`Failed to set ${email}'s database role to ${DB_ROLE}: ${roleError.message}`);
  }

  // Exactly one membership row, in the demo org only. This is the entire
  // tenant boundary: private.current_org_ids() reads this table, so an org
  // with no row here is invisible to this identity — which is what keeps the
  // real TEKGUYZ tenant unreachable.
  const { error: memberError } = await admin
    .from("organization_members")
    .upsert(
      { organization_id: orgId, user_id: userId, role: "MEMBER" },
      { onConflict: "organization_id,user_id" },
    );
  if (memberError) {
    throw new Error(`Failed to add demo visitor to org ${orgId}: ${memberError.message}`);
  }

  return { userId, created };
}
