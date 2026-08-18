import { getCurrentOrg } from "@/lib/organizations/current";
import { getWebhookSecret } from "@/lib/organizations/queries";
import { trimTrailingSlash } from "@/lib/utils/trim-trailing-slash";
import { TeamPanel } from "@/components/settings/TeamPanel";
import { OrgDetailsPanel } from "@/components/settings/OrgDetailsPanel";
import { ApiKeysPanel } from "@/components/settings/ApiKeysPanel";
import { AccountPanel } from "@/components/settings/AccountPanel";

export default async function SettingsPage() {
  const { orgId, orgName, orgTimezone, currencyFormat, role, userId, userEmail, displayName, notifyNewLead, notifyWeeklyReport } =
    await getCurrentOrg();
  const canManageOrg = role === "OWNER" || role === "ADMIN";

  // Only fetched for OWNER/ADMIN — the RPC itself also re-checks role
  // server-side, so this isn't the only line of defense, but there's no
  // reason to even make the call (or risk it landing in the page payload)
  // for a plain MEMBER.
  const signingSecret = canManageOrg ? await getWebhookSecret(orgId) : null;
  const appUrl = trimTrailingSlash(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000");
  // The endpoint URL is keyed on organization_id and carries no credential —
  // it is safe in a log, a ticket or a screenshot. The signing secret beside
  // it is the credential, and it is still OWNER/ADMIN-only for exactly the
  // reason the comment above says: it never gets fetched for a MEMBER at all,
  // so it never lands in the RSC payload for one.
  const webhookUrl = canManageOrg ? `${appUrl}/api/v1/triage/${orgId}` : null;

  return (
    <div className="space-y-6">
      <OrgDetailsPanel
        orgName={orgName}
        orgTimezone={orgTimezone}
        currencyFormat={currencyFormat}
        webhookUrl={webhookUrl}
        signingSecret={signingSecret}
        canEdit={canManageOrg}
      />
      <TeamPanel
        orgId={orgId}
        canManage={canManageOrg}
        currentUserId={userId}
        currentUserRole={role}
      />
      <ApiKeysPanel canEdit={canManageOrg} />
      <AccountPanel
        userEmail={userEmail}
        displayName={displayName}
        notifyNewLead={notifyNewLead}
        notifyWeeklyReport={notifyWeeklyReport}
      />
    </div>
  );
}
