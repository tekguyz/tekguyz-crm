import { createAdminClient } from "./clients";

// Keeps real people out of the demo org's team list.
//
// public.get_organization_members returns each member's auth.users email, and
// the app shell renders that list on every page — so once /demo is public,
// every member email in TEKGUYZ Demo is on a page strangers can read. On
// 2026-09-04 that was opsmiller85@gmail.com, a real address, appearing twice:
// once as a MEMBER and once as an ACCEPTED invite.
//
// Only @example.com addresses belong here. That domain is reserved by RFC 2606
// precisely so it can never be a real mailbox, which makes it the one
// unambiguous signal that an address in a public demo is synthetic.
//
// This removes memberships and invites, never auth accounts — the person keeps
// their login and any other org. Scoped to the demo org by id, and it will not
// run against any other org.
const ALLOWED_DOMAIN = "@example.com";

export type HygieneResult = {
  removedMembers: string[];
  removedInvites: string[];
};

export async function removeRealPeopleFromDemoOrg(orgId: string): Promise<HygieneResult> {
  const admin = createAdminClient();

  const { data: members, error: memberError } = await admin
    .from("organization_members")
    .select("user_id, role")
    .eq("organization_id", orgId);
  if (memberError) throw new Error(`Failed to list demo members: ${memberError.message}`);

  const { data: userList, error: userError } = await admin.auth.admin.listUsers();
  if (userError) throw new Error(`Failed to list users: ${userError.message}`);

  const removedMembers: string[] = [];
  for (const m of members ?? []) {
    const email = userList.users.find((u) => u.id === m.user_id)?.email ?? "";
    if (email.toLowerCase().endsWith(ALLOWED_DOMAIN)) continue;

    // Refuse to strip the org's last OWNER. An org without an owner is a state
    // this codebase never creates on purpose, and hygiene is not a good enough
    // reason to be the first thing that does.
    if (m.role === "OWNER") {
      const owners = (members ?? []).filter((x) => x.role === "OWNER");
      if (owners.length <= 1) {
        throw new Error(
          `${email} is the demo org's only OWNER and is not an ${ALLOWED_DOMAIN} address. ` +
            `Refusing to remove it — make an ${ALLOWED_DOMAIN} account OWNER first.`,
        );
      }
    }

    const { error } = await admin
      .from("organization_members")
      .delete()
      .eq("organization_id", orgId)
      .eq("user_id", m.user_id);
    if (error) throw new Error(`Failed to remove ${email}: ${error.message}`);
    removedMembers.push(email);
  }

  // Invites carry the invitee's email in a column of their own, so an accepted
  // or pending invite leaks the address even after the membership is gone.
  const { data: invites, error: inviteError } = await admin
    .from("organization_invites")
    .select("id, email")
    .eq("organization_id", orgId);
  if (inviteError) throw new Error(`Failed to list demo invites: ${inviteError.message}`);

  const removedInvites: string[] = [];
  for (const inv of invites ?? []) {
    const email = String(inv.email ?? "");
    if (email.toLowerCase().endsWith(ALLOWED_DOMAIN)) continue;

    const { error } = await admin.from("organization_invites").delete().eq("id", inv.id);
    if (error) throw new Error(`Failed to remove invite for ${email}: ${error.message}`);
    removedInvites.push(email);
  }

  return { removedMembers, removedInvites };
}
