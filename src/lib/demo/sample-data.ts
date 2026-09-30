import { DEMO_LEADS, type DemoLog } from "./sample-leads";
import { DEMO_PROSPECTS, type DemoProspect } from "./sample-prospects";
import { DEMO_TASKS } from "./sample-tasks";

// Turns the Sample Data definitions into rows, resolved against one moment.
//
// Two consumers, one shape:
//   - the "start demo" action passes the result, as JSON, to the
//     create_demo_org database function, which writes it all in one
//     transaction (supabase/migrations/20260929120000_demo_org_per_guest.sql);
//   - the TEKGUYZ Demo seed scripts insert the same rows with the admin client.
//
// The rows carry no organization_id and tasks carry no created_by. The
// consumer adds those, so the payload can never name a tenant it should not.
//
// Lead ids are made here, not by the database, so submissions, activity logs
// and tasks can name their lead in the same payload with no lookup.
//
// A plain module — see sample-leads.ts for why.

export type SampleLeadRow = {
  id: string;
  client_name: string;
  email: string;
  phone: string;
  company: string;
  website: string;
  physical_address: string;
  lead_source: string;
  service_category: string;
  estimated_revenue: number;
  status: string;
  outcome: string | null;
  actual_revenue: number | null;
  closed_at: string | null;
  next_action_at: string;
  created_at: string;
  is_starred: boolean;
  ai_brief: string | null;
};

export type SampleSubmissionRow = {
  lead_id: string;
  client_name: string;
  email: string;
  phone: string;
  company: string;
  message: string | null;
  service_category: string;
  lead_source: string;
  created_at: string;
};

export type SampleActivityLogRow = {
  lead_id: string;
  log_type: DemoLog["log_type"];
  content: string;
  created_at: string;
};

export type SampleTaskRow = {
  lead_id: string;
  title: string;
  description: string | null;
  due_at: string;
  completed: boolean;
  completed_at: string | null;
};

export type SampleData = {
  leads: SampleLeadRow[];
  submissions: SampleSubmissionRow[];
  activity_logs: SampleActivityLogRow[];
  tasks: SampleTaskRow[];
  prospects: DemoProspect[];
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function buildSampleData(
  now: Date,
  newId: () => string = () => globalThis.crypto.randomUUID(),
): SampleData {
  const daysFromNow = (days: number) => new Date(now.getTime() + days * DAY_MS).toISOString();

  // A task is due at a fixed hour of the day, not at "now + n days", so the
  // agenda reads like a working day rather than a list of odd minutes.
  const dueAt = (days: number, hour: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    d.setHours(hour, 0, 0, 0);
    return d.toISOString();
  };

  const leads: SampleLeadRow[] = [];
  const submissions: SampleSubmissionRow[] = [];
  const activityLogs: SampleActivityLogRow[] = [];

  for (const def of DEMO_LEADS) {
    const { logs, closedDaysAgo, nextActionDays, createdDaysAgo, ...rest } = def;
    const id = newId();
    const createdAt = daysFromNow(-createdDaysAgo);

    leads.push({
      id,
      ...rest,
      closed_at: closedDaysAgo !== null ? daysFromNow(closedDaysAgo) : null,
      next_action_at: daysFromNow(nextActionDays),
      created_at: createdAt,
    });

    // Every lead path writes a submission row
    // (.claude/rules/leads-and-ingestion.md), the Sample Data included, or the
    // profile sheet's enquiry history would render empty.
    submissions.push({
      lead_id: id,
      client_name: def.client_name,
      email: def.email,
      phone: def.phone,
      company: def.company,
      message: webhookMessageOf(logs),
      service_category: def.service_category,
      lead_source: def.lead_source,
      created_at: createdAt,
    });

    for (const log of logs ?? []) {
      activityLogs.push({
        lead_id: id,
        log_type: log.log_type,
        content: log.content,
        created_at: daysFromNow(-log.daysAgo),
      });
    }
  }

  const tasks: SampleTaskRow[] = DEMO_TASKS.filter((t) => t.leadIndex < leads.length).map((t) => ({
    lead_id: leads[t.leadIndex].id,
    title: t.title,
    description: t.description,
    due_at: dueAt(t.dueInDays, t.hour),
    completed: t.completed,
    completed_at: t.completed ? dueAt(t.dueInDays, t.hour) : null,
  }));

  return {
    leads,
    submissions,
    activity_logs: activityLogs,
    tasks,
    prospects: DEMO_PROSPECTS.map((prospect) => ({ ...prospect })),
  };
}

// The Sample Data's enquiry text already exists once, inside each lead's
// WEBHOOK log payload. Reading it back out gives the submission a real message
// without a second copy of the same sentence to keep in sync. Sample Data only:
// the live ingest path writes lead_submissions.message from the validated
// payload and never parses a log.
function webhookMessageOf(logs: DemoLog[] | undefined): string | null {
  const webhook = logs?.find((log) => log.log_type === "WEBHOOK");
  if (!webhook) return null;

  try {
    const parsed: unknown = JSON.parse(webhook.content);
    const message = (parsed as Record<string, unknown>)?.message;
    return typeof message === "string" ? message : null;
  } catch {
    return null;
  }
}
