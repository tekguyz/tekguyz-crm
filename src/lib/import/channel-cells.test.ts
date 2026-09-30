import { describe, expect, it } from "vitest";
import { clearJunkChannelCells } from "@/lib/import/channel-cells";

describe("clearJunkChannelCells", () => {
  it("keeps real links to the right site, as written", () => {
    const row = {
      client_name: "LJ Air",
      website: "ljair.com",
      social_facebook: "https://m.facebook.com/LJAir/",
      social_instagram: "https://www.instagram.com/ljair",
      social_whatsapp: "https://wa.me/13055551234",
      social_google_business: "https://www.google.com/maps/search/?api=1&query=LJ+Air",
      email: "Owner@LJAir.com",
    };
    expect(clearJunkChannelCells(row)).toEqual({ row, warnings: [] });
  });

  it.each([
    ["website", "N/A"],
    ["website", "no website"],
    ["social_facebook", "N/A"],
    ["social_facebook", "https://instagram.com/ljair"],
    ["social_instagram", "@ljair"],
    ["social_instagram", "https://facebook.com/ljair"],
    ["social_whatsapp", "+1 305 555 1234"],
    ["social_whatsapp", "https://facebook.com/ljair"],
    ["social_google_business", "LJ Air on Google"],
    ["social_google_business", "https://evil.com/?google.com"],
    ["email", "N/A"],
  ])("clears a junk %s cell (%j) and warns", (field, value) => {
    const { row, warnings } = clearJunkChannelCells({ client_name: "LJ Air", phone: "305", [field]: value });
    expect(row[field]).toBe("");
    expect(row.phone).toBe("305");
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain(`"${value}"`);
  });

  it("leaves blank cells alone without a warning", () => {
    const { row, warnings } = clearJunkChannelCells({ client_name: "LJ Air", social_facebook: "  ", website: "" });
    expect(row).toEqual({ client_name: "LJ Air", social_facebook: "  ", website: "" });
    expect(warnings).toEqual([]);
  });

  it("accepts the other Facebook, WhatsApp and Google link forms", () => {
    const row = {
      social_facebook: "fb.com/profile.php?id=123",
      social_whatsapp: "https://api.whatsapp.com/send?phone=13055551234",
      social_google_business: "https://maps.app.goo.gl/AbC123",
    };
    expect(clearJunkChannelCells(row).warnings).toEqual([]);
  });

  it("does not touch null values from an already-validated row", () => {
    const row = { client_name: "LJ Air", social_facebook: null, phone: "305" };
    expect(clearJunkChannelCells(row)).toEqual({ row, warnings: [] });
  });
});
