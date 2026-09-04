import { createAdminClient } from "./clients";

// Synthetic follow-up tasks for the demo org, so Agenda, Today and the
// calendar have something to render. Added 2026-09-04: the demo org seeded
// leads, activity_logs and prospects but never any tasks, so a visitor
// arriving through the public /demo link saw three empty views and read them
// as unfinished features rather than empty states.
//
// Deliberately spread across overdue / today / upcoming, because that spread
// is what actually exercises the UI: an overdue task is what drives the
// Going Cold SLA styling, and a mix is what makes the agenda look like a real
// working day rather than a list.
//
// Every title is transparently about a seeded, invented company — same
// fiction rules as demo-data.ts and demo-prospects.ts. Nothing here refers to
// a real person or a real engagement.

type DemoTask = {
  // Which seeded lead this hangs off, by position in the org's lead list.
  // Positional rather than by name so a change to demo-data.ts's roster
  // cannot silently orphan a task.
  leadIndex: number;
  title: string;
  description: string | null;
  // Days from now. Negative is overdue, 0 is today, positive is upcoming.
  dueInDays: number;
  hour: number;
  completed: boolean;
};

const DEMO_TASKS: DemoTask[] = [
  {
    leadIndex: 0,
    title: "Send revised roofing quote",
    description: "They asked for the tear-off line itemised separately.",
    dueInDays: -3,
    hour: 9,
    completed: false,
  },
  {
    leadIndex: 1,
    title: "Chase solar site-survey date",
    description: "Second attempt — no reply to the first email.",
    dueInDays: -1,
    hour: 14,
    completed: false,
  },
  {
    leadIndex: 2,
    title: "Call back about the detailing package",
    description: null,
    dueInDays: 0,
    hour: 11,
    completed: false,
  },
  {
    leadIndex: 3,
    title: "Confirm landscaping start date",
    description: "Crew availability confirmed for the week after next.",
    dueInDays: 0,
    hour: 16,
    completed: false,
  },
  {
    leadIndex: 4,
    title: "Prepare maintenance contract draft",
    description: "Annual, quarterly visits, use the standard terms.",
    dueInDays: 2,
    hour: 10,
    completed: false,
  },
  {
    leadIndex: 5,
    title: "Follow up on the deposit invoice",
    description: null,
    dueInDays: 5,
    hour: 9,
    completed: false,
  },
  {
    leadIndex: 0,
    title: "Log the initial site photos",
    description: "Uploaded to the shared drive.",
    dueInDays: -6,
    hour: 15,
    completed: true,
  },
  {
    leadIndex: 2,
    title: "Send the intro pack",
    description: null,
    dueInDays: -4,
    hour: 13,
    completed: true,
  },
];

function dueAt(dueInDays: number, hour: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dueInDays);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

export async function countDemoTasks(orgId: string): Promise<number> {
  const admin = createAdminClient();
  const { count, error } = await admin
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId);

  if (error) throw new Error(`Failed to count demo tasks: ${error.message}`);
  return count ?? 0;
}

export async function seedDemoTasks(orgId: string): Promise<number> {
  const admin = createAdminClient();

  // Ordered so leadIndex is stable across runs. Without an explicit order,
  // Postgres may hand back rows in any sequence and the same task would
  // attach to a different lead on every reseed.
  const { data: leads, error: leadError } = await admin
    .from("leads")
    .select("id")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: true });

  if (leadError) throw new Error(`Failed to load demo leads for tasks: ${leadError.message}`);
  if (!leads?.length) {
    throw new Error("No demo leads exist — seed leads before tasks (tasks.lead_id is NOT NULL).");
  }

  // tasks.created_by is NOT NULL with an FK to auth.users. The demo org's
  // OWNER is the natural author. Resolved from the membership table rather
  // than by hardcoding the email a second time — demo-org.ts already owns
  // that string, and a second copy would drift.
  const { data: owner, error: ownerError } = await admin
    .from("organization_members")
    .select("user_id")
    .eq("organization_id", orgId)
    .eq("role", "OWNER")
    .limit(1)
    .single();

  if (ownerError || !owner) {
    throw new Error(`Failed to resolve the demo org's OWNER: ${ownerError?.message ?? "none found"}`);
  }

  const rows = DEMO_TASKS.filter((t) => t.leadIndex < leads.length).map((t) => ({
    organization_id: orgId,
    lead_id: leads[t.leadIndex].id,
    title: t.title,
    description: t.description,
    due_at: dueAt(t.dueInDays, t.hour),
    completed: t.completed,
    completed_at: t.completed ? dueAt(t.dueInDays, t.hour) : null,
    created_by: owner.user_id,
  }));

  const { error } = await admin.from("tasks").insert(rows);
  if (error) throw new Error(`Failed to seed demo tasks: ${error.message}`);

  return rows.length;
}

// No wipeDemoTasks here on purpose. tasks.lead_id is ON DELETE CASCADE, so
// wipeDemoLeads already removes every demo task; a wipe function would have no
// caller, and CLAUDE.md's standing rule is that a part with no consumer is
// scope creep. If tasks ever gain a path that outlives their lead, add it then.
