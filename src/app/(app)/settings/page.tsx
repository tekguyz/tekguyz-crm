import { getCurrentOrg } from "@/lib/organizations/current";
import { getWebhookSecret } from "@/lib/organizations/queries";
import { TeamPanel } from "@/components/settings/TeamPanel";
import { OrgDetailsPanel } from "@/components/settings/OrgDetailsPanel";
import { ApiKeysPanel } from "@/components/settings/ApiKeysPanel";

export default async function SettingsPage() {
  const { orgId, orgName, orgTimezone, currencyFormat, role } = await getCurrentOrg();
  const canManageOrg = role === "OWNER" || role === "ADMIN";

  // Only fetched for OWNER/ADMIN — the RPC itself also re-checks role
  // server-side, so this isn't the only line of defense, but there's no
  // reason to even make the call (or risk it landing in the page payload)
  // for a plain MEMBER.
  const webhookSecret = canManageOrg ? await getWebhookSecret(orgId) : null;

  return (
    <div className="space-y-6">
      <OrgDetailsPanel
        orgName={orgName}
        orgTimezone={orgTimezone}
        currencyFormat={currencyFormat}
        webhookSecret={webhookSecret}
        canEdit={canManageOrg}
      />
      <TeamPanel orgId={orgId} canManage={canManageOrg} />
      <ApiKeysPanel canEdit={canManageOrg} />
    </div>
  );
}
