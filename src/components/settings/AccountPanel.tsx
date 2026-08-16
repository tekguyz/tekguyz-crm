"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  updateDisplayName,
  updateNotificationPreferences,
  type AccountFormState,
} from "@/lib/account/actions";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

const initialState: AccountFormState = null;

// Restates Button's `secondary` classes rather than composing Button, for the
// same reason alert-dialog.tsx does: this control is a navigation <Link>, and
// Button renders a <button> with no asChild escape hatch. Keep in sync with
// Button's secondary variant + md size.
const LINK_BUTTON_CLASS =
  "text-body-md inline-flex h-8 items-center justify-center rounded-md border border-hairline bg-canvas-pure px-3 font-medium text-ink-main transition-colors hover:bg-canvas-soft";

export function AccountPanel({
  userEmail,
  displayName,
  notifyNewLead,
  notifyWeeklyReport,
}: {
  userEmail: string;
  displayName: string | null;
  notifyNewLead: boolean;
  notifyWeeklyReport: boolean;
}) {
  const [nameState, nameAction, nameIsPending] = useActionState(updateDisplayName, initialState);
  const [prefsState, prefsAction, prefsIsPending] = useActionState(
    updateNotificationPreferences,
    initialState,
  );

  return (
    <Card className="p-6">
      <h2 className="text-h2 mb-4">Account</h2>

      <div className="space-y-2">
        <p className="text-label text-ink-muted">Email</p>
        <p className="text-body-md text-ink-main">{userEmail}</p>
      </div>

      <div className="mt-4 border-t border-hairline pt-4">
        <p className="text-label mb-1 text-ink-muted">Password</p>
        <p className="text-caption mb-2 text-ink-muted">
          Set a new password for your account.
        </p>
        <Link href="/reset-password" className={LINK_BUTTON_CLASS}>
          Change password
        </Link>
      </div>

      <form
        key={displayName ?? ""}
        action={nameAction}
        className="mt-4 space-y-3 border-t border-hairline pt-4"
      >
        {nameState?.error && (
          <p className="text-body-sm rounded-xs border border-hairline bg-pill-orange-bg px-3 py-2 text-pill-orange-fg">
            {nameState.error}
          </p>
        )}
        {nameState?.success && (
          <p className="text-body-sm rounded-xs border border-hairline bg-pill-green-bg px-3 py-2 text-pill-green-fg">
            Saved.
          </p>
        )}
        <Input
          label="Display name"
          name="display_name"
          defaultValue={displayName ?? ""}
          placeholder="Not set — using your email's first letter"
        />
        <Button type="submit" variant="primary" loading={nameIsPending}>
          {nameIsPending ? "Saving…" : "Save name"}
        </Button>
      </form>

      <form
        key={`${notifyNewLead}-${notifyWeeklyReport}`}
        action={prefsAction}
        className="mt-4 space-y-3 border-t border-hairline pt-4"
      >
        {prefsState?.error && (
          <p className="text-body-sm rounded-xs border border-hairline bg-pill-orange-bg px-3 py-2 text-pill-orange-fg">
            {prefsState.error}
          </p>
        )}
        {prefsState?.success && (
          <p className="text-body-sm rounded-xs border border-hairline bg-pill-green-bg px-3 py-2 text-pill-green-fg">
            Saved.
          </p>
        )}
        <p className="text-label mb-1 text-ink-muted">Email notifications</p>
        <p className="text-caption mb-2 text-ink-muted">
          Only applies while you&apos;re an owner or admin — these emails never go to members.
        </p>
        {/* These two stay raw <input type="checkbox">: src/components/ui/ has no
            Checkbox primitive, and Input is a labelled text field (w-full,
            px-2 py-1, label stacked above) that cannot be bent into a 16px
            inline box without fighting it. Prompt 2c's fence says to report a
            missing primitive rather than extend one inline, so that is what
            this is. They are unstyled-by-token but keyboard-reachable: the
            global :focus-visible rule in globals.css deliberately excludes
            [type=checkbox] from the field ring so they get the standard
            2px accent outline instead. */}
        <div className="space-y-2">
          <label className="text-body-md flex items-center gap-2 text-ink-main">
            <input
              type="checkbox"
              name="notify_new_lead"
              defaultChecked={notifyNewLead}
              className="size-4 rounded-xs border-hairline"
            />
            New lead alerts
          </label>
          <label className="text-body-md flex items-center gap-2 text-ink-main">
            <input
              type="checkbox"
              name="notify_weekly_report"
              defaultChecked={notifyWeeklyReport}
              className="size-4 rounded-xs border-hairline"
            />
            Weekly revenue report
          </label>
        </div>
        <Button type="submit" variant="primary" loading={prefsIsPending}>
          {prefsIsPending ? "Saving…" : "Save preferences"}
        </Button>
      </form>
    </Card>
  );
}
