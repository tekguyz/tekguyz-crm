// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEMO_BLOCK_MESSAGE, isDemoBlock } from "@/lib/demo/demo-block-message";

// Every Demo Block, called the way an attacker would: straight at the Server
// Action, with no page in front of it. A Server Action is a public HTTP
// endpoint, so a hidden button proves nothing; the refusal has to be here.
//
// Supabase, Resend and the credential resolver all throw if touched. A blocked
// action must refuse BEFORE any of them, so nothing is written, sent or billed.
// The real-org controls at the bottom prove the same harness does reach them,
// so a pass above is not a pass by accident.

const TOUCHED = "touched an outside service";
const touched = () => {
  throw new Error(TOUCHED);
};

const DEMO_ORG = "11111111-1111-4111-8111-111111111111";

async function load(isDemo: boolean) {
  vi.resetModules();
  vi.doMock("server-only", () => ({}));
  vi.doMock("next/cache", () => ({ revalidatePath: vi.fn() }));
  vi.doMock("@/lib/organizations/current", () => ({
    getCurrentOrg: vi.fn(async () => ({ orgId: DEMO_ORG, role: "OWNER", isDemo })),
  }));
  vi.doMock("@/lib/supabase/server", () => ({ createClient: vi.fn(touched) }));
  vi.doMock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn(touched) }));
  vi.doMock("@/lib/demo/is-demo-org", () => ({ isDemoOrg: vi.fn(async () => isDemo) }));
  vi.doMock("@/lib/credentials/resolve-org-credential", () => ({ resolveOrgCredential: vi.fn(touched) }));
  vi.doMock("resend", () => ({ Resend: vi.fn(touched) }));
  vi.doMock("@/lib/supabase/service-role", () => ({
    createWebhookServiceClient: () => ({
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: { webhook_secret: "secret", is_demo: isDemo }, error: null }),
          }),
        }),
      }),
    }),
  }));
}

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.append(key, value);
  return data;
}

describe("Demo Blocks, called directly in a Demo Org", () => {
  beforeEach(() => load(true));

  it("refuses saving credentials", async () => {
    const { saveOrganizationCredentials } = await import("@/lib/actions/credentials-actions");
    expect(await saveOrganizationCredentials(null, form({ api_key_gemini: "AIza-real-key", api_key_anthropic: "" }))).toEqual({
      error: DEMO_BLOCK_MESSAGE,
    });
  });

  it("refuses clearing credentials", async () => {
    const { clearOrganizationCredential } = await import("@/lib/actions/credentials-actions");
    expect(await clearOrganizationCredential("api_key_gemini")).toEqual({ error: DEMO_BLOCK_MESSAGE });
  });

  it("refuses rotating the webhook secret", async () => {
    const { rotateWebhookSecret } = await import("@/lib/organizations/actions");
    expect(await rotateWebhookSecret()).toEqual({ error: DEMO_BLOCK_MESSAGE });
  });

  it("refuses reading the webhook secret", async () => {
    const { getWebhookSecret } = await import("@/lib/organizations/queries");
    expect(await getWebhookSecret(DEMO_ORG)).toBeNull();
  });

  it("refuses creating an invite", async () => {
    const { createInvite } = await import("@/lib/invites/actions");
    expect(await createInvite(null, form({ email: "someone@example.com", role: "MEMBER" }))).toEqual({
      error: DEMO_BLOCK_MESSAGE,
    });
  });

  it("refuses a lead CSV import", async () => {
    const { batchInsertLeads } = await import("@/lib/actions/import-actions");
    const result = await batchInsertLeads([{ client_name: "A", email: "a@example.com" } as never]);
    expect(result.error).toBe(DEMO_BLOCK_MESSAGE);
    expect(result.imported).toBe(0);
  });

  it("refuses a prospect CSV import", async () => {
    const { importProspects } = await import("@/lib/actions/prospect-import-actions");
    const result = await importProspects([{ place_id: "p", name: "A" } as never]);
    expect(result.error).toBe(DEMO_BLOCK_MESSAGE);
    expect(result.imported).toBe(0);
  });

  it("refuses audio transcription, tagged so the note form can say why", async () => {
    const { addAudioTranscript } = await import("@/lib/activity/actions");
    const error = await addAudioTranscript("lead-1", new Blob(["x"])).catch((e: unknown) => e);
    expect(isDemoBlock(error)).toBe(true);
  });

  it("sends no new-lead email", async () => {
    const { sendNewLeadNotification } = await import("@/lib/email/notify-new-lead");
    await expect(sendNewLeadNotification(DEMO_ORG, { id: "lead-1" } as never)).resolves.toBeUndefined();
  });

  it("gives the inbound webhook no signing key, so it refuses the Demo Org", async () => {
    const { getOrgSigningKey } = await import("@/lib/webhooks/resolve-tenant");
    expect(await getOrgSigningKey(DEMO_ORG)).toBeNull();
  });
});

describe("the same calls in a real org still reach the outside service", () => {
  beforeEach(() => load(false));

  it("credentials reach Supabase", async () => {
    const { saveOrganizationCredentials } = await import("@/lib/actions/credentials-actions");
    await expect(saveOrganizationCredentials(null, form({ api_key_gemini: "AIza-real-key", api_key_anthropic: "" }))).rejects.toThrow(TOUCHED);
  });

  it("the invite reaches Supabase", async () => {
    const { createInvite } = await import("@/lib/invites/actions");
    await expect(createInvite(null, form({ email: "someone@example.com", role: "MEMBER" }))).rejects.toThrow(
      TOUCHED,
    );
  });

  it("the new-lead email reaches the credential resolver", async () => {
    const { sendNewLeadNotification } = await import("@/lib/email/notify-new-lead");
    await expect(sendNewLeadNotification(DEMO_ORG, { id: "lead-1" } as never)).rejects.toThrow(TOUCHED);
  });

  it("the webhook gets its signing key", async () => {
    const { getOrgSigningKey } = await import("@/lib/webhooks/resolve-tenant");
    expect(await getOrgSigningKey(DEMO_ORG)).toBe("secret");
  });
});
