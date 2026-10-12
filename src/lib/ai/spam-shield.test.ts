// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

// #6: the tekguyz.com form's own page copy and placeholders must never reach
// the model as if a visitor wrote them. The model reads that copy as bot
// boilerplate and flags real enquiries.

vi.mock("server-only", () => ({}));

const generateContent = vi.fn();
vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    models = { generateContent };
  },
  Type: { OBJECT: "OBJECT", BOOLEAN: "BOOLEAN", STRING: "STRING" },
}));

import { evaluateLeadForSpam } from "@/lib/ai/spam-shield";

// The /contact hero subhead as a scraper submits it: curly quotes, because the
// page renders &rsquo;.
const HERO_SUBHEAD =
  "Tell us what you\u2019re working with and what you\u2019re trying to fix. We\u2019ll take it from there.";
const DEFAULT_PLACEHOLDER = "Tell us what you're trying to fix or build.";

async function messageSentToModel(message: string | undefined): Promise<string> {
  await evaluateLeadForSpam(
    { clientName: "Alex Rivera", email: "alex@rivera-stone.example", message },
    "test-key",
  );
  const call = generateContent.mock.calls[0][0] as { contents: string };
  return (JSON.parse(call.contents) as { message: string }).message;
}

beforeEach(() => {
  generateContent.mockReset();
  generateContent.mockResolvedValue({ text: JSON.stringify({ verified: true, reasoning: "ok" }) });
});

describe("evaluateLeadForSpam: site page copy", () => {
  it("sends an empty message when the message is only the hero subhead", async () => {
    expect(await messageSentToModel(HERO_SUBHEAD)).toBe("");
  });

  it("sends an empty message when it is only a textarea placeholder", async () => {
    expect(await messageSentToModel(DEFAULT_PLACEHOLDER)).toBe("");
  });

  it("removes the copy but keeps our own budget prefix", async () => {
    const sent = await messageSentToModel(`Budget: $50k+\n\n${HERO_SUBHEAD}`);
    expect(sent).toBe("Budget: $50k+");
  });

  it("leaves a real message untouched", async () => {
    const real = "We book about 40 jobs a week in a spreadsheet and it keeps double-booking us.";
    expect(await messageSentToModel(real)).toBe(real);
  });

  it("still returns the model's verdict", async () => {
    generateContent.mockResolvedValue({
      text: JSON.stringify({ verified: false, reasoning: "bot" }),
    });
    const verdict = await evaluateLeadForSpam(
      { clientName: "x", email: "x@x.example", message: "buy seo now" },
      "test-key",
    );
    expect(verdict).toEqual({ verified: false, reasoning: "bot" });
  });
});
