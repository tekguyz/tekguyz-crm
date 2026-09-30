import {
  IconBrandFacebook,
  IconBrandGoogle,
  IconBrandInstagram,
  IconBrandWhatsapp,
  IconMail,
  IconMapPin,
  IconMessage,
  IconPhone,
  IconWorld,
} from "@tabler/icons-react";

import type { ChannelLinkKind } from "@/lib/leads/channel-links";

// One Tabler outline icon per Click-to-Action link (DESIGN.md § Iconography).
// Shared by the profile header and the Contacts card so a channel looks the
// same everywhere it appears.
const ICONS = {
  call: IconPhone,
  text: IconMessage,
  email: IconMail,
  whatsapp: IconBrandWhatsapp,
  website: IconWorld,
  facebook: IconBrandFacebook,
  instagram: IconBrandInstagram,
  google: IconBrandGoogle,
  map: IconMapPin,
} satisfies Record<ChannelLinkKind, unknown>;

export function ChannelIcon({ kind, className }: { kind: ChannelLinkKind; className?: string }) {
  const Icon = ICONS[kind];
  return <Icon stroke={1.75} aria-hidden className={className} />;
}
