import { Badge, type BadgeTone } from "@/components/ui/Badge";

// A role looks the same everywhere it shows: a member row, a pending invite and
// the manager's role select all wear this one hue (the select takes the same
// tone through BADGE_TONE_CLASSES, as the Prospects status select does).
// Plain module, no directive: MemberRow is a client component and TeamPanel is
// a server one, and both read it.
//
// The role's word is always in the pill. Colour is the quick read, never the
// only one.
const ROLE_TONE: Record<string, BadgeTone> = {
  OWNER: "purple",
  ADMIN: "sky",
  MEMBER: "teal",
};

const ROLE_LABEL: Record<string, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  MEMBER: "Member",
};

export function roleTone(role: string): BadgeTone {
  return ROLE_TONE[role] ?? "neutral";
}

export function roleLabel(role: string): string {
  return ROLE_LABEL[role] ?? role.charAt(0) + role.slice(1).toLowerCase();
}

export function RoleBadge({ role }: { role: string }) {
  return (
    <Badge tone={roleTone(role)} dot>
      {roleLabel(role)}
    </Badge>
  );
}
