import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type NotificationType = "new_lead" | "weekly_report";

// organizations has no dedicated "notification email" field, so recipients
// are resolved from who can actually act on tenant data: OWNER/ADMIN members
// who haven't opted out of this specific notification type via their own
// organization_members.notify_new_lead/notify_weekly_report flag.
// organization_members only has user_id — auth.users isn't exposed via
// PostgREST, so emails come from the service-role Auth Admin API instead.
// Extracted out of notify-new-lead.ts once the weekly report became a second
// caller of this exact resolution logic — do not duplicate it again.
export async function getOwnerAdminRecipients(
  organizationId: string,
  notificationType: NotificationType,
): Promise<string[]> {
  const column = notificationType === "new_lead" ? "notify_new_lead" : "notify_weekly_report";
  const supabase = createAdminClient();
  const { data: members } = await supabase
    .from("organization_members")
    .select("user_id")
    .eq("organization_id", organizationId)
    .in("role", ["OWNER", "ADMIN"])
    .eq(column, true);

  if (!members?.length) return [];

  const emails = await Promise.all(
    members.map(async ({ user_id }) => {
      const { data } = await supabase.auth.admin.getUserById(user_id);
      return data.user?.email ?? null;
    }),
  );

  return emails.filter((email): email is string => Boolean(email));
}
