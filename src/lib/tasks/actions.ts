"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/organizations/current";
import { getTasksForLead, type Task } from "@/lib/tasks/queries";

export type TaskFormState = { error?: string } | null;

const taskSchema = z.object({
  title: z.string().trim().min(1, "Task title is required"),
  // Submitted as a full ISO string by TasksSection, converted client-side from
  // the datetime-local input's local-timezone value — same reasoning as
  // EditLeadModal's next_action_at: the browser's Date object actually knows
  // the user's offset, so the server never has to guess one.
  due_at: z
    .string()
    .trim()
    .refine((value) => !Number.isNaN(Date.parse(value)), "Invalid due date"),
});

// Client-callable boundary — TasksSection is a client component, so it can't
// import server-only code like createClient() directly. Same thin-wrapper
// pattern as fetchActivityLogs.
//
// Returns the org timezone alongside the rows because formatDueAt() needs one:
// every other consumer gets it threaded down from a server page, but
// ProfileSheet is mounted from inside EditLeadModal and never receives it.
// Resolving it here keeps the tenant's real display timezone authoritative
// without prop-drilling it through the whole modal chain.
export async function fetchTasksForLead(
  leadId: string,
): Promise<{ tasks: Task[]; timeZone: string }> {
  const { orgTimezone } = await getCurrentOrg();
  return { tasks: await getTasksForLead(leadId), timeZone: orgTimezone };
}

export async function createTask(
  leadId: string,
  _prevState: TaskFormState,
  formData: FormData,
): Promise<TaskFormState> {
  const parsed = taskSchema.safeParse({
    title: formData.get("title") ?? "",
    due_at: formData.get("due_at") ?? "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in to add a task." };
  }

  // Derive organization_id from the lead itself (RLS-scoped) rather than
  // trusting a client-supplied org id — a lead outside the caller's tenant
  // isn't found here, making a cross-tenant task insert impossible. Same
  // pattern addManualNote uses.
  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("organization_id")
    .eq("id", leadId)
    .single();

  if (leadError || !lead) {
    return { error: "Lead not found." };
  }

  const { error } = await supabase.from("tasks").insert({
    lead_id: leadId,
    organization_id: lead.organization_id,
    title: parsed.data.title,
    due_at: new Date(parsed.data.due_at).toISOString(),
    created_by: user.id,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  return null;
}

// Called server-side by archiveLead() when a lead is archived: closes that
// lead's still-open tasks so none linger pointing at a dead lead, and logs a
// single SYSTEM_ALERT summarizing the count.
//
// Extracted here rather than inlined into archiveLead for file-size reasons
// (lib/leads/actions.ts was at the 200-line cap). archiveLead itself has since
// moved to lib/leads/archive-actions.ts; this helper stays here because it
// owns `tasks`, not because of where its caller lives.
//
// Deliberately NEVER throws and never rethrows. Archiving the lead is the
// primary action; a task-cleanup failure must not block it or roll it back,
// so every failure path logs and returns 0. Returns the number closed.
export async function closeTasksForArchivedLead(
  leadId: string,
  orgId: string,
): Promise<number> {
  try {
    const supabase = await createClient();

    // `.select("id")` is both the hardening and the counter: a bulk UPDATE
    // can't use .single(), but selecting the affected rows means an
    // RLS-denied write comes back as zero rows instead of a silent
    // error-free "success" — and zero rows then correctly writes no log.
    const { data: closed, error } = await supabase
      .from("tasks")
      .update({ completed: true, completed_at: new Date().toISOString() })
      .eq("lead_id", leadId)
      .eq("completed", false)
      .select("id");

    if (error) {
      console.error(`[closeTasksForArchivedLead] lead ${leadId}:`, error.message);
      return 0;
    }

    const count = closed?.length ?? 0;

    // No SYSTEM_ALERT when nothing was closed — a "0 open task(s) auto-closed"
    // entry is noise in the timeline, not signal.
    if (count === 0) return 0;

    const { error: logError } = await supabase.from("activity_logs").insert({
      lead_id: leadId,
      organization_id: orgId,
      log_type: "SYSTEM_ALERT",
      content: `${count} open task(s) auto-closed — parent lead archived.`,
    });

    if (logError) {
      console.error(`[closeTasksForArchivedLead] log for ${leadId}:`, logError.message);
    }

    return count;
  } catch (err) {
    console.error(
      `[closeTasksForArchivedLead] unexpected failure for lead ${leadId}:`,
      err instanceof Error ? err.message : err,
    );
    return 0;
  }
}

export async function toggleTaskComplete(taskId: string, completed: boolean): Promise<void> {
  const supabase = await createClient();

  // .select().single() deliberately chained: a bare .update().eq() that RLS
  // denies affects zero rows and still returns error: null, which would report
  // a successful toggle on a write that never happened — the same silent-no-op
  // shape rotateWebhookSecret was hardened against (see CLAUDE.md Known Gaps).
  const { error } = await supabase
    .from("tasks")
    .update({
      completed,
      completed_at: completed ? new Date().toISOString() : null,
    })
    .eq("id", taskId)
    .select("id")
    .single();

  if (error) throw error;

  revalidatePath("/", "layout");
}
