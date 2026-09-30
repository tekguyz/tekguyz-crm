import type { Lead } from "@/lib/leads/queries";

// The Click-to-Action shortcuts for one lead: one link per Contact Channel it
// has, plus the Maps deep link for its address (#37). A channel the lead does
// not have gives no link, so no surface can render an empty `mailto:`.
//
// Shared by the profile header (icon only) and the Contacts card (icon and
// word), so the two can never disagree about which links a lead has.
//
// The link values come from outside the app — the webhook, a CSV, a hand
// edit — so a web link is only ever http or https. A value with any other
// scheme (javascript:, data:) gives no link rather than a live one.

export type ChannelLinkKind =
  | "call"
  | "text"
  | "email"
  | "whatsapp"
  | "website"
  | "facebook"
  | "instagram"
  | "google"
  | "map";

export type ChannelLink = {
  kind: ChannelLinkKind;
  label: string;
  href: string;
  // Opens in a new tab. The protocol links (tel:, sms:, mailto:) hand off to
  // another app instead.
  external: boolean;
};

type ChannelFields = Pick<
  Lead,
  | "phone"
  | "email"
  | "website"
  | "social_facebook"
  | "social_instagram"
  | "social_whatsapp"
  | "social_google_business"
  | "physical_address"
>;

// A bare "ljair.com" gets https://. Anything that already names a scheme must
// name http or https.
function webHref(value: string | null): string | null {
  const text = value?.trim();
  if (!text) return null;
  if (/^https?:\/\//i.test(text)) return text;
  if (/^[a-z][a-z0-9+.-]*:/i.test(text)) return null;
  return `https://${text}`;
}

export function channelLinks(lead: ChannelFields): ChannelLink[] {
  const links: ChannelLink[] = [];
  const add = (kind: ChannelLinkKind, label: string, href: string | null, external: boolean) => {
    if (href) links.push({ kind, label, href, external });
  };

  const phone = lead.phone?.trim();
  const email = lead.email?.trim();
  const address = lead.physical_address?.trim();

  add("call", "Call", phone ? `tel:${phone}` : null, false);
  add("text", "Text", phone ? `sms:${phone}` : null, false);
  add("email", "Email", email ? `mailto:${email}` : null, false);
  add("whatsapp", "WhatsApp", webHref(lead.social_whatsapp), true);
  add("website", "Website", webHref(lead.website), true);
  add("facebook", "Facebook", webHref(lead.social_facebook), true);
  add("instagram", "Instagram", webHref(lead.social_instagram), true);
  add("google", "Google", webHref(lead.social_google_business), true);
  add(
    "map",
    "Map",
    address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : null,
    true,
  );

  return links;
}
