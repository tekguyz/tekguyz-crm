"use client";

import { useActionState, useState, type MouseEvent } from "react";
import { toast } from "sonner";
import {
  updateOrgSettings,
  rotateWebhookSecret,
  type OrgSettingsFormState,
} from "@/lib/organizations/actions";
import { CopyButton } from "@/components/ui/CopyButton";
import { HelpTooltip } from "@/components/help/HelpTooltip";
import { TIMEZONES, CURRENCIES } from "@/lib/organizations/org-options";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const initialState: OrgSettingsFormState = null;

// All four Settings panels keep p-6 rather than Card's stock p-4: these are
// page-width containers holding whole forms, not the dense list cards Card was
// tuned for. Padding is layout, not a token — same reasoning as ThemeToggle's
// `w-8 px-0`. What Card brings is the Level 0 surface: v1 gave these panels a
// shadow-elevation-1, which v2 reserves for popovers.
export function OrgDetailsPanel({
  orgName,
  orgTimezone,
  currencyFormat,
  webhookUrl,
  canEdit,
}: {
  orgName: string;
  orgTimezone: string;
  currencyFormat: string;
  webhookUrl: string | null;
  canEdit: boolean;
}) {
  const [state, formAction, isPending] = useActionState(updateOrgSettings, initialState);
  const [currentWebhookUrl, setCurrentWebhookUrl] = useState(webhookUrl);
  const [rotateDialogOpen, setRotateDialogOpen] = useState(false);
  const [rotating, setRotating] = useState(false);

  async function handleRotateConfirm(e: MouseEvent<HTMLButtonElement>) {
    // Same "don't auto-close on click" override as EditLeadModal's archive
    // confirm — stay open through the async call, only close on success.
    e.preventDefault();
    setRotating(true);
    try {
      const result = await rotateWebhookSecret();
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setCurrentWebhookUrl(result.webhookUrl ?? null);
      toast.success("Webhook secret rotated — the old URL no longer works.");
      setRotateDialogOpen(false);
    } finally {
      setRotating(false);
    }
  }

  return (
    <Card className="p-6">
      <h2 className="text-h2 mb-4">Organization</h2>

      {canEdit ? (
        <form
          key={`${orgName}-${orgTimezone}-${currencyFormat}`}
          action={formAction}
          className="space-y-3"
        >
          {state?.error && (
            <p className="text-body-sm rounded-xs border border-hairline bg-pill-orange-bg px-3 py-2 text-pill-orange-fg">
              {state.error}
            </p>
          )}
          <Input label="Organization name" name="name" defaultValue={orgName} required />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Timezone" name="timezone" defaultValue={orgTimezone}>
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </Select>
            <Select label="Currency" name="currency_format" defaultValue={currencyFormat}>
              {CURRENCIES.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </Select>
          </div>
          <Button type="submit" variant="primary" loading={isPending}>
            {isPending ? "Saving…" : "Save changes"}
          </Button>
        </form>
      ) : (
        <dl className="text-body-md space-y-2">
          <div className="flex justify-between">
            <dt className="text-ink-muted">Name</dt>
            <dd className="text-ink-main">{orgName}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-muted">Timezone</dt>
            <dd className="text-ink-main">{orgTimezone}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-muted">Currency</dt>
            <dd className="text-ink-main">{currencyFormat}</dd>
          </div>
        </dl>
      )}

      {canEdit && currentWebhookUrl && (
        <div className="mt-4 border-t border-hairline pt-4">
          {/* Not a <label>: it names a read-only <code> block, not a form
              control, so it never had an htmlFor to point at. */}
          <div className="text-label mb-1 flex items-center gap-1.5 text-ink-muted">
            Webhook URL
            <HelpTooltip
              topicId="webhook-setup"
              blurb="POST inbound leads here from Zapier or a form provider. The secret is part of the URL, so treat the whole thing as a credential."
            />
          </div>
          <p className="text-caption mb-2 text-ink-muted">
            Send inbound leads here (e.g. from Zapier) as a POST request — this URL is
            tenant-scoped and authenticates the request on its own. Only owners and admins can
            view this.
          </p>
          <div className="flex items-center gap-2">
            <code className="text-caption flex-1 truncate rounded-xs border border-hairline bg-canvas-soft px-2 py-1 text-ink-main">
              {currentWebhookUrl}
            </code>
            <CopyButton text={currentWebhookUrl} />
          </div>

          <AlertDialog open={rotateDialogOpen} onOpenChange={setRotateDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="secondary" className="mt-2">
                Rotate webhook secret
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Rotate webhook secret?</AlertDialogTitle>
                <AlertDialogDescription>
                  This immediately invalidates the current webhook URL. Any integration still
                  POSTing to the old URL — Zapier, a form provider, anything — will start
                  failing the moment you confirm, until it&apos;s updated with the new URL.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction disabled={rotating} onClick={handleRotateConfirm}>
                  {rotating ? "Rotating…" : "Rotate secret"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </Card>
  );
}
