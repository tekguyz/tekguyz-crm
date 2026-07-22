import "server-only";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@/lib/supabase/server";
import { resolveOrgCredential } from "@/lib/credentials/resolve-org-credential";
import type { ActivityLog } from "@/lib/activity/queries";

const TRANSCRIPTION_MODEL = "gemini-3.5-flash-lite";
const TRANSCRIPTION_TIMEOUT_MS = 20000;
const AUDIO_BUCKET = "audio-notes";

const TRANSCRIPTION_PROMPT =
  "Transcribe this voice memo verbatim. Return only the transcription text, no commentary or formatting.";

// Split out of activity/actions.ts (Prompt 7's file) rather than growing it —
// this pipeline (storage upload, credential resolution, external API call)
// is a meaningfully different concern than the simple CRUD wrappers there.
export async function transcribeAndSaveAudioNote(
  leadId: string,
  audioBlob: Blob,
): Promise<ActivityLog> {
  const supabase = await createClient();

  // Derive organization_id from the lead itself (RLS-scoped), same pattern
  // as addManualNote — a lead outside the caller's tenant simply won't be
  // found, and the upload path below is built from this, never from
  // client-supplied input.
  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("organization_id")
    .eq("id", leadId)
    .single();

  if (leadError || !lead) {
    throw new Error("Lead not found.");
  }

  const organizationId: string = lead.organization_id;
  const mimeType = audioBlob.type || "audio/webm";
  const extension = mimeType.includes("webm") ? "webm" : "wav";
  const path = `${organizationId}/${leadId}/${Date.now()}.${extension}`;

  const arrayBuffer = await audioBlob.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { error: uploadError } = await supabase.storage
    .from(AUDIO_BUCKET)
    .upload(path, buffer, { contentType: mimeType });

  if (uploadError) {
    throw new Error(`Failed to upload audio: ${uploadError.message}`);
  }

  // Fallback behavior: no credential, a Gemini error, or a timeout must never
  // lose the recording — the audio is already uploaded above regardless of
  // what happens next. Each case just changes what the log's content says.
  const content = await transcribeOrFallback(organizationId, buffer, mimeType);

  const { data, error } = await supabase
    .from("activity_logs")
    .insert({
      lead_id: leadId,
      organization_id: organizationId,
      log_type: "AUDIO_TRANSCRIPT",
      content,
      audio_url: path,
    })
    .select("id, lead_id, log_type, content, audio_url, created_at")
    .single();

  if (error) throw error;
  return data;
}

async function transcribeOrFallback(
  organizationId: string,
  buffer: Buffer,
  mimeType: string,
): Promise<string> {
  const { value: apiKey } = await resolveOrgCredential(organizationId, "api_key_gemini");
  if (!apiKey) {
    return "[Transcription unavailable — no Gemini credential configured. Raw audio saved above.]";
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await withTimeout(
      ai.models.generateContent({
        model: TRANSCRIPTION_MODEL,
        contents: [
          {
            role: "user",
            parts: [
              { inlineData: { mimeType, data: buffer.toString("base64") } },
              { text: TRANSCRIPTION_PROMPT },
            ],
          },
        ],
      }),
      TRANSCRIPTION_TIMEOUT_MS,
    );

    const text = response.text?.trim();
    if (!text) throw new Error("empty transcription response");
    return text;
  } catch (err) {
    console.error(`[transcribeAndSaveAudioNote] transcription failed for org ${organizationId}:`, err);
    return "[Transcription failed — raw audio saved above.]";
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error("Transcription timed out")), ms);
    }),
  ]);
}
