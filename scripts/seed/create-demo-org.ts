// Creates (idempotently) a dedicated "TEKGUYZ Demo" organization with
// realistic mock leads/activity_logs and synthetic prospects, entirely
// separate from the real TEKGUYZ tenant — so there's something worth looking
// at for design evaluation without ever touching real data.
//
// Usage: npm run seed:demo
//
// Safe to re-run: leads and prospects are each seeded only when that table is
// empty for the demo org, so a re-run is a no-op for whichever is already
// there (use `npm run seed:demo:reset` to wipe and reseed fresh).
import { ensureDemoOrg, DEMO_ORG_NAME } from "./lib/demo-org";
import { ensureDemoVisitor } from "./lib/demo-visitor";
import { createAdminClient } from "./lib/clients";
import { seedDemoLeads, countDemoLeads } from "./lib/demo-data";
import { seedDemoProspects, countDemoProspects } from "./lib/demo-prospects";
import { seedDemoTasks, countDemoTasks } from "./lib/demo-tasks";
import { reportNonDemoOrgSafety } from "./lib/safety";

async function main() {
  await reportNonDemoOrgSafety("before");

  console.log(`\nEnsuring "${DEMO_ORG_NAME}" exists...`);
  const { orgId, orgCreated } = await ensureDemoOrg();
  console.log(orgCreated ? `Created org ${orgId}` : `Found existing org ${orgId}`);

  // Marks this org for the weekly-report cron's exclusion and the voice
  // transcription skip. Re-asserted every run so a restored backup or a manual
  // edit cannot silently leave the demo org receiving real report emails again.
  const { error: markError } = await createAdminClient()
    .from("organizations")
    .update({ is_demo: true })
    .eq("id", orgId);
  if (markError) {
    throw new Error(`Failed to mark org ${orgId} as is_demo: ${markError.message}`);
  }
  console.log(`Marked ${orgId} as is_demo — excluded from the weekly-report cron.`);

  // The public read-only demo identity. Powerless by grant (the demo_readonly
  // Postgres role), not by hidden UI.
  const { userId: visitorId, created: visitorCreated } = await ensureDemoVisitor(orgId);
  console.log(
    visitorCreated
      ? `Created read-only demo visitor ${visitorId}.`
      : `Found existing read-only demo visitor ${visitorId} — role, password and membership re-asserted.`,
  );

  // Leads and prospects are checked independently rather than behind one
  // early return. They are separate tables filled by separate units, and a
  // demo org seeded before prospects existed would otherwise never get any.
  const existingLeadCount = await countDemoLeads(orgId);
  if (existingLeadCount > 0) {
    console.log(
      `\n"${DEMO_ORG_NAME}" already has ${existingLeadCount} lead(s) — skipping lead seeding to avoid duplicates.`,
    );
  } else {
    console.log("\nSeeding demo leads and activity logs...");
    const { leadCount, logCount } = await seedDemoLeads(orgId);
    console.log(`Seeded ${leadCount} leads and ${logCount} activity log entries.`);
  }

  // Tasks are checked independently for the same reason leads and prospects
  // are, and must run after leads: tasks.lead_id is NOT NULL.
  const existingTaskCount = await countDemoTasks(orgId);
  if (existingTaskCount > 0) {
    console.log(`"${DEMO_ORG_NAME}" already has ${existingTaskCount} task(s) — skipping task seeding.`);
  } else {
    console.log("Seeding demo follow-up tasks...");
    const taskCount = await seedDemoTasks(orgId);
    console.log(`Seeded ${taskCount} tasks.`);
  }

  const existingProspectCount = await countDemoProspects(orgId);
  if (existingProspectCount > 0) {
    console.log(
      `"${DEMO_ORG_NAME}" already has ${existingProspectCount} prospect(s) — skipping prospect seeding.`,
    );
  } else {
    console.log("Seeding synthetic demo prospects...");
    const prospectCount = await seedDemoProspects(orgId);
    console.log(`Seeded ${prospectCount} prospects.`);
  }

  console.log(
    `\nRun \`npm run seed:demo:reset\` to wipe and reseed fresh.` +
      `\n\nThis org is marked is_demo, so the weekly revenue cron skips it — no report email is generated ` +
      `for or sent to the demo account, and no Gemini narrative is billed for it. (That warning used to ` +
      `live here as an open flag; the exclusion it asked for shipped 2026-09-04.)`,
  );

  await reportNonDemoOrgSafety("after");
}

main().catch((err) => {
  console.error("\nSeed failed:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
