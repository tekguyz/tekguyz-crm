import { describe, expect, it } from "vitest";
import { channelLinks } from "@/lib/leads/channel-links";

const none = {
  phone: null,
  email: null,
  website: null,
  social_facebook: null,
  social_instagram: null,
  social_whatsapp: null,
  social_google_business: null,
  physical_address: null,
};

describe("channelLinks", () => {
  it("gives no link at all for a lead with no channels, so there is never an empty mailto:", () => {
    expect(channelLinks(none)).toEqual([]);
  });

  it("gives one link per channel the lead has, in a fixed order", () => {
    const links = channelLinks({
      phone: "(305) 555-0141",
      email: "owner@ljair.test",
      website: "ljair.test/menu",
      social_facebook: "https://facebook.com/ljair",
      social_instagram: "instagram.com/ljair",
      social_whatsapp: "https://wa.me/13055550141",
      social_google_business: "https://maps.google.com/?cid=1",
      physical_address: "100 Test Way, Miami",
    });

    expect(links.map((l) => [l.kind, l.label, l.href, l.external])).toEqual([
      ["call", "Call", "tel:(305) 555-0141", false],
      ["text", "Text", "sms:(305) 555-0141", false],
      ["email", "Email", "mailto:owner@ljair.test", false],
      ["whatsapp", "WhatsApp", "https://wa.me/13055550141", true],
      ["website", "Website", "https://ljair.test/menu", true],
      ["facebook", "Facebook", "https://facebook.com/ljair", true],
      ["instagram", "Instagram", "https://instagram.com/ljair", true],
      ["google", "Google", "https://maps.google.com/?cid=1", true],
      [
        "map",
        "Map",
        "https://www.google.com/maps/search/?api=1&query=100%20Test%20Way%2C%20Miami",
        true,
      ],
    ]);
  });

  it("drops a link whose scheme is not http or https", () => {
    const links = channelLinks({
      ...none,
      website: "javascript:alert(1)",
      social_facebook: "data:text/html,hi",
      social_instagram: "  ",
    });
    expect(links).toEqual([]);
  });
});
