import "server-only";
import { GoogleGenAI } from "@google/genai";
import { resolveOrgCredential } from "@/lib/credentials/resolve-org-credential";
import { GEMINI_REPORT_MODEL } from "@/lib/ai/models";
import type { OrgRevenueAggregate } from "@/lib/reports/aggregate-org-revenue";

const NARRATIVE_TIMEOUT_MS = 15000;

const SYSTEM_PROMPT =
  "You are writing a short Monday-morning executive summary for a small business's sales " +
  "pipeline, based on this month's revenue numbers. Write 2-4 sentences of plain prose " +
  "highlighting the most important trend or number — not a restatement of every figure " +
  "given to you. If the month is quiet (little to no activity), say so plainly and briefly " +
  "rather than manufacturing insight. No headers, no bullet lists, no preamble like 'Here is " +
  "a summary' — just the narrative itself.";

// The only place Gemini gets called in this feature. Never throws: returns
// null when no credential is reachable (org or platform) or when the call
// itself fails or times out, so one org's missing key or a transient Gemini
// outage never blocks that org's report — sendWeeklyReport substitutes a
// plain-language fallback note instead (see the fallback behavior spec).
export async function generateExecutiveNarrative(
  organizationId: string,
  aggregatedData: OrgRevenueAggregate,
): Promise<string | null> {
  const { value: apiKey } = await resolveOrgCredential(organizationId, "api_key_gemini");
  if (!apiKey) {
    console.error(
      `[generateExecutiveNarrative] no Gemini credential configured (org or platform) for org ${organizationId} — skipping narrative`,
    );
    return null;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await withTimeout(
      ai.models.generateContent({
        model: GEMINI_REPORT_MODEL,
        contents: JSON.stringify(aggregatedData),
        config: {
          systemInstruction: SYSTEM_PROMPT,
          temperature: 0.4,
        },
      }),
      NARRATIVE_TIMEOUT_MS,
    );

    const text = response.text?.trim();
    if (!text) throw new Error("empty narrative response");
    return text;
  } catch (err) {
    console.error(`[generateExecutiveNarrative] narrative generation failed for org ${organizationId}:`, err);
    return null;
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error("Narrative generation timed out")), ms);
    }),
  ]);
}
