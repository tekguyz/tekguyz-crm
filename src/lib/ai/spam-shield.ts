import "server-only";
import { GoogleGenAI, Type } from "@google/genai";
import { GEMINI_SPAM_SHIELD_MODEL } from "@/lib/ai/models";

const SPAM_SHIELD_TIMEOUT_MS = 8000;

const SYSTEM_PROMPT =
  "You are a spam filter for a small business's inbound lead form. Given a submitted " +
  "lead's name, email, and optional message, decide whether this is a genuine business " +
  "inquiry or spam/bot noise (gibberish, unrelated marketing/SEO pitches, obvious bot " +
  'patterns, adult/scam content). Respond with strict JSON: {"verified": boolean, ' +
  '"reasoning": string}. "verified" is true for legitimate leads, false for spam. Keep ' +
  "reasoning to one short sentence. When uncertain, prefer verified: true — the cost of a " +
  "false positive (blocking a real customer) is higher than a false negative.";

export type SpamShieldPayload = {
  clientName: string;
  email: string;
  message?: string;
};

export type SpamShieldVerdict = {
  verified: boolean;
  reasoning: string;
};

// Pure function: (content, key) -> verdict. No side effects, no database
// access — archiving and logging based on the verdict stay in ingest-lead.ts.
export async function evaluateLeadForSpam(
  payload: SpamShieldPayload,
  apiKey: string,
): Promise<SpamShieldVerdict> {
  const ai = new GoogleGenAI({ apiKey });

  const userContent = JSON.stringify({
    name: payload.clientName,
    email: payload.email,
    message: payload.message ?? "",
  });

  const response = await withTimeout(
    ai.models.generateContent({
      model: GEMINI_SPAM_SHIELD_MODEL,
      contents: userContent,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        // Binary classification, not a creative task — keep it deterministic-leaning.
        temperature: 0.1,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            verified: { type: Type.BOOLEAN },
            reasoning: { type: Type.STRING },
          },
          required: ["verified", "reasoning"],
        },
      },
    }),
    SPAM_SHIELD_TIMEOUT_MS,
  );

  const text = response.text;
  if (!text) {
    throw new Error("Spam Shield returned no content");
  }

  const parsed = JSON.parse(text) as { verified?: unknown; reasoning?: unknown };
  return {
    verified: Boolean(parsed.verified),
    reasoning: typeof parsed.reasoning === "string" ? parsed.reasoning : "",
  };
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error("Spam Shield request timed out")), ms);
    }),
  ]);
}
