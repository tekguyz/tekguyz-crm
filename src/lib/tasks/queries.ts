import { createClient } from "@/lib/supabase/server";

export type Task = {
  id: string;
  lead_id: string;
  title: string;
  description: string | null;
  due_at: string;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
};

const TASK_COLUMNS =
  "id, lead_id, title, description, due_at, completed, completed_at, created_at";

// Scoped by RLS alone (no explicit organization_id filter) — the caller only
// has a lead id here, same shape as getActivityLogs/getLeadById. A leadId
// outside the caller's tenant simply returns zero rows.
//
// Sorted soonest-due first and NOT filtered by `completed`: the Open/Completed
// split is a client-side view toggle in TasksSection, so both sets come back
// in one round trip and switching tabs never refetches.
export async function getTasksForLead(leadId: string): Promise<Task[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select(TASK_COLUMNS)
    .eq("lead_id", leadId)
    .order("due_at", { ascending: true });

  if (error) throw error;
  return data;
}
