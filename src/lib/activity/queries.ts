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

  // audio_url is stored as a private-bucket storage path, not a directly
  // playable URL (the audio-notes bucket is not public) — resolve a
  // short-lived signed URL for any row that has one.
  return Promise.all(
    data.map(async (log) => {
      if (!log.audio_url) return log;
      const { data: signed } = await supabase.storage
        .from("audio-notes")
        .createSignedUrl(log.audio_url, 3600);
      return { ...log, audio_url: signed?.signedUrl ?? null };
    }),
  );
}
