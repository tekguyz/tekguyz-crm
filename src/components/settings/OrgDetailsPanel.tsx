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
  signingSecret,
  canEdit,
}: {
  orgName: string;
  orgTimezone: string;
  currencyFormat: string;
  webhookUrl: string | null;
  signingSecret: string | null;
  canEdit: boolean;
}) {
  const [state, formAction, isPending] = useActionState(updateOrgSettings, initialState);
  // Only the secret is stateful. The endpoint URL is keyed on organization_id
  // and does not change when the signing key rotates — that is the point of
  // the split, and showing it as rotatable would teach the wrong model.
  const [currentSigningSecret, setCurrentSigningSecret] = useState(signingSecret);
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
      setCurrentSigningSecret(result.signingSecret ?? null);
      toast.success("Signing secret rotated — signatures made with the old secret are now rejected.");
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

      {canEdit && webhookUrl && (
        <div className="mt-4 border-t border-hairline pt-4">
          {/* Not a <label>: it names a read-only <code> block, not a form
              control, so it never had an htmlFor to point at. */}
          <div className="text-label mb-1 flex items-center gap-1.5 text-ink-muted">
            Inbound lead webhook
            <HelpTooltip
              topicId="webhook-setup"
              blurb="POST inbound leads here from Zapier or your site's backend. The URL is public; the signing secret below is the credential."
            />
          </div>
          <p className="text-caption mb-3 text-ink-muted">
            POST inbound leads to this endpoint. Every request must carry an{" "}
            <code className="text-ink-main">X-TekGuyz-Signature</code> header holding the
            hex-encoded HMAC-SHA256 of the exact request body, keyed by the signing secret
            below. Requests without a valid signature are rejected — the URL alone grants
            nothing.
          </p>

          <div className="text-label mb-1 text-ink-muted">Endpoint URL</div>
          <p className="text-caption mb-2 text-ink-muted">
            Not a credential. Safe to paste into a ticket or a config file.
          </p>
          <div className="flex items-center gap-2">
            <code className="text-caption flex-1 truncate rounded-xs border border-hairline bg-canvas-soft px-2 py-1 text-ink-main">
              {webhookUrl}
            </code>
            <CopyButton text={webhookUrl} />
          </div>

          {currentSigningSecret && (
            <>
              <div className="text-label mt-3 mb-1 text-ink-muted">Signing secret</div>
              <p className="text-caption mb-2 text-ink-muted">
                Treat this like a password. It is never sent with a request — it only keys the
                signature. Owners and admins only.
              </p>
              <div className="flex items-center gap-2">
                <code className="text-caption flex-1 truncate rounded-xs border border-hairline bg-canvas-soft px-2 py-1 text-ink-main">
                  {currentSigningSecret}
                </code>
                <CopyButton text={currentSigningSecret} />
              </div>
            </>
          )}

          <AlertDialog open={rotateDialogOpen} onOpenChange={setRotateDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="secondary" className="mt-3">
                Rotate signing secret
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Rotate signing secret?</AlertDialogTitle>
                <AlertDialogDescription>
                  This takes effect immediately. The endpoint URL stays the same, but any
                  integration still signing with the old secret — Zapier, your site&apos;s
                  contact form, anything — starts getting rejected the moment you confirm,
                  until it&apos;s updated with the new secret.
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
