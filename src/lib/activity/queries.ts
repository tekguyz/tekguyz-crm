import { createClient } from "@/lib/supabase/server";

export type ActivityLog = {
  id: string;
  lead_id: string;
  log_type: "WEBHOOK" | "MANUAL_NOTE" | "AUDIO_TRANSCRIPT" | "SYSTEM_ALERT";
  content: string;
  audio_url: string | null;
  created_at: string;
};

const ACTIVITY_LOG_COLUMNS = "id, lead_id, log_type, content, audio_url, created_at";

export async function getActivityLogs(leadId: string): Promise<ActivityLog[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("activity_logs")
    .select(ACTIVITY_LOG_COLUMNS)
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}
