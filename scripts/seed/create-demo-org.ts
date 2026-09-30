// Creates (idempotently) a dedicated "TEKGUYZ Demo" organization filled with
// the Sample Data, entirely separate from the real TEKGUYZ tenant — so there's
// something worth looking at for design evaluation without ever touching real
// data.
//
// This org exists for /api/dev-login only. The public demo gives each Guest
// their own Demo Org instead (#29, docs/adr/0001-each-guest-gets-their-own-demo-org.md).
//
// Usage: npm run seed:demo
//
// Safe to re-run: the Sample Data is seeded only when the demo org has no
// leads, so a re-run is a no-op (use `npm run seed:demo:reset` to wipe and
// reseed fresh).
import { ensureDemoOrg, DEMO_ORG_NAME } from "./lib/demo-org";
import { removeRealPeopleFromDemoOrg } from "./lib/demo-membership-hygiene";
import { createAdminClient } from "./lib/clients";
import { seedSampleData, countDemoLeads } from "./lib/seed-sample-data";
import { reportNonDemoOrgSafety } from "./lib/safety";

async function main() {
  await reportNonDemoOrgSafety("before");

  console.log(`\nEnsuring "${DEMO_ORG_NAME}" exists...`);
  const { orgId, orgCreated } = await ensureDemoOrg();
  console.log(orgCreated ? `Created org ${orgId}` : `Found existing org ${orgId}`);

  // Marks this org for the weekly-report cron's exclusion and the Demo Block.
  // Re-asserted every run so a restored backup or a manual edit cannot
  // silently leave the demo org receiving real report emails again.
  const { error: markError } = await createAdminClient()
    .from("organizations")
    .update({ is_demo: true })
    .eq("id", orgId);
  if (markError) {
    throw new Error(`Failed to mark org ${orgId} as is_demo: ${markError.message}`);
  }
  console.log(`Marked ${orgId} as is_demo — excluded from the weekly-report cron.`);

  // The app shell renders the org's member list (with real email addresses)
  // on every page. Anything that is not an @example.com address is a real
  // person's address in a sample org.
  const hygiene = await removeRealPeopleFromDemoOrg(orgId);
  if (hygiene.removedMembers.length || hygiene.removedInvites.length) {
    console.log(
      `Removed non-@example.com identities from the demo org — ` +
        `members: [${hygiene.removedMembers.join(", ") || "none"}], ` +
        `invites: [${hygiene.removedInvites.join(", ") || "none"}]. ` +
        `Auth accounts themselves were not touched.`,
    );
  } else {
    console.log("Demo org membership is @example.com only — nothing to redact.");
  }

  const existingLeadCount = await countDemoLeads(orgId);
  if (existingLeadCount > 0) {
    console.log(
      `\n"${DEMO_ORG_NAME}" already has ${existingLeadCount} lead(s) — skipping the Sample Data to avoid duplicates.`,
    );
  } else {
    console.log("\nSeeding the Sample Data...");
    const counts = await seedSampleData(orgId);
    console.log(`Seeded ${JSON.stringify(counts)}.`);
  }

  console.log(
    `\nRun \`npm run seed:demo:reset\` to wipe and reseed fresh.` +
      `\n\nThis org is marked is_demo, so the weekly revenue cron skips it — no report email is generated ` +
      `for or sent to the demo account, and no Gemini narrative is billed for it.`,
  );

  await reportNonDemoOrgSafety("after");
}

main().catch((err) => {
  console.error("\nSeed failed:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
