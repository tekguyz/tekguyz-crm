import { createClient } from "@/lib/supabase/server";

export type Task = {
  id: string;
  lead_id: string;
  title: string;
  description: string | null;
  due_at: string;
  completed: boolean;
  completed_at: string | null;
  dismissed: boolean;
  created_at: string;
};

const TASK_COLUMNS =
  "id, lead_id, title, description, due_at, completed, completed_at, dismissed, created_at";

// Scoped by RLS alone (no explicit organization_id filter) — the caller only
// has a lead id here, same shape as getActivityLogs/getLeadById. A leadId
// outside the caller's tenant simply returns zero rows.
//
// Sorted soonest-due first and NOT filtered by `completed`: the Open/Completed
// split is a client-side view toggle in TasksSection, so both sets come back
// in one round trip and switching tabs never refetches.
//
// `dismissed` IS filtered here, and at the database rather than in the client
// toggle: dismissal is not a third view, it is removal from every active
// surface. The row stays in the table and stays queryable for audit; it just
// never reaches a rendering surface again. Orthogonal to `completed` — a
// dismissed task is filtered out whether it was completed or not.
export async function getTasksForLead(leadId: string): Promise<Task[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select(TASK_COLUMNS)
    .eq("lead_id", leadId)
    .eq("dismissed", false)
    .order("due_at", { ascending: true });

  if (error) throw error;
  return data;
}

// Flattened for the agenda row — the client name comes from the embedded
// lead, so callers never deal with the nested PostgREST shape.
export type TaskDue = {
  id: string;
  title: string;
  due_at: string;
  lead_id: string;
  client_name: string;
};

// Org-wide open tasks, soonest due first. Deliberately NOT date-bounded:
// this is an ordered worklist ("what's next"), not a today-only slice.
//
// The `leads!inner(...)` + `.eq("leads.archived", false)` filter is
// defense-in-depth and is required regardless of whether any application-layer
// auto-close of an archived lead's tasks exists. Archiving is the app's only
// delete (Resurrection Engine), so an archived lead's tasks must never surface
// here — and this query must stay correct in isolation, so that a future code
// path which archives a lead WITHOUT going through archiveLead() still can't
// leak a task into the agenda. `!inner` is what makes the embedded filter
// actually restrict rows rather than just null out the embed.
export async function getTasksDueForOrg(orgId: string): Promise<TaskDue[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("id, title, due_at, lead_id, leads!inner(client_name, archived)")
    .eq("organization_id", orgId)
    .eq("completed", false)
    .eq("dismissed", false)
    .eq("leads.archived", false)
    .order("due_at", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row) => {
    // PostgREST returns a to-one embed as an object, but supabase-js's types
    // widen it to a possible array — normalize rather than assert.
    const lead = Array.isArray(row.leads) ? row.leads[0] : row.leads;
    return {
      id: row.id,
      title: row.title,
      due_at: row.due_at,
      lead_id: row.lead_id,
      client_name: lead?.client_name ?? "Unknown lead",
    };
  });
}

// Flattened for the command palette's task result row — same shape rationale
// as TaskDue, plus `completed` because the row renders the strikethrough/muted
// treatment TaskRow already uses for a completed task.
export type TaskSearchResult = {
  id: string;
  title: string;
  due_at: string;
  completed: boolean;
  lead_id: string;
  client_name: string;
};

// Tenant-wide task search source for the command palette. Fetched once when
// the palette opens and ranked client-side by Fuse, exactly as
// fetchSearchableContacts already is — so there is no per-keystroke round trip
// and no pagination question to answer.
//
// Three deliberate filter decisions:
//
//   `dismissed = false` — dismissal is removal from every active surface, the
//   role `archived` plays for a lead. A dismissed task must not be findable.
//
//   NO `completed` filter — completed is ordinary lifecycle state, not
//   removal. A finished task is legitimate history a user searches for, the
//   same precedent the Contacts directory sets by showing WON/LOST/ABANDONED.
//   getTasksDueForOrg DOES filter it, because an agenda is a worklist; this is
//   a search index and the two must not be assumed to share a filter shape.
//
//   `leads!inner(...)` + `leads.archived = false` — and this one is NOT
//   redundant. closeTasksForArchivedLead (lib/tasks/actions.ts) writes
//   `completed = true` when a lead is archived, never `dismissed`, so an
//   archived lead's tasks remain dismissed = false and would otherwise be
//   returned by this query. With no `completed` filter above to incidentally
//   hide them, this join is the ONLY thing keeping an archived lead's tasks
//   out of global search. `!inner` is what makes the embedded filter restrict
//   rows rather than just null out the embed.
//
// No new SQL: both tables are already covered by plain
// `organization_id IN (SELECT private.current_org_ids())` RLS policies, so the
// tenant boundary here is the same one every other read uses.
export async function searchTasksForOrg(orgId: string): Promise<TaskSearchResult[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("id, title, due_at, completed, lead_id, leads!inner(client_name, archived)")
    .eq("organization_id", orgId)
    .eq("dismissed", false)
    .eq("leads.archived", false)
    .order("due_at", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row) => {
    // Same to-one embed normalization as getTasksDueForOrg — supabase-js
    // widens the type to a possible array, so normalize rather than assert.
    const lead = Array.isArray(row.leads) ? row.leads[0] : row.leads;
    return {
      id: row.id,
      title: row.title,
      due_at: row.due_at,
      completed: row.completed,
      lead_id: row.lead_id,
      client_name: lead?.client_name ?? "Unknown lead",
    };
  });
}
