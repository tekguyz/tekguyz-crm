import { describe, expect, it } from "vitest";
import { CONTACT_CHANNEL_FIELDS, hasContactChannel } from "@/lib/leads/contact-rule";

describe("hasContactChannel", () => {
  it.each(CONTACT_CHANNEL_FIELDS)("counts %s on its own", (field) => {
    expect(hasContactChannel({ [field]: "x" })).toBe(true);
  });

  it("does not count blank, whitespace or null values", () => {
    expect(hasContactChannel({ email: "", phone: "   ", website: null, social_whatsapp: undefined })).toBe(false);
  });

  it("does not count anything outside the channel list", () => {
    expect(hasContactChannel({ physical_address: "1 Main St", company: "Acme" } as never)).toBe(false);
  });
});
