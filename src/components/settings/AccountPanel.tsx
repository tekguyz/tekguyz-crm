"use client";

import { useActionState, useRef, useState } from "react";

import { useFormResetRestore } from "@/lib/forms/use-form-reset-restore";
import Link from "next/link";
import {
  updateDisplayName,
  updateNotificationPreferences,
  type AccountFormState,
} from "@/lib/account/actions";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";

const initialState: AccountFormState = null;

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
  // CONTROLLED, not defaultValue/defaultChecked. React 19 resets a
  // <form action={...}> after the action returns — including on failure — by
  // calling form.reset() and re-rendering, which wiped the typed name and
  // reverted both toggles. The checkboxes are affected too: Radix survives a
  // bare reset() on its own, but not the re-render that follows it. The `key`
  // on each form re-seeds this state from fresh server props after a save.
  // See CLAUDE.md § Form/Action Field Parity.
  const [name, setName] = useState(displayName ?? "");
  const [newLead, setNewLead] = useState(notifyNewLead);
  const [weeklyReport, setWeeklyReport] = useState(notifyWeeklyReport);

  // Controlling the checkboxes is necessary but NOT sufficient: Radix restores
  // its own mount-time value on a form reset. The shared hook explains why and
  // handles the ordering; these refs hold what the user actually chose.
  const intent = useRef({ newLead: notifyNewLead, weeklyReport: notifyWeeklyReport });
  const anchor = useRef<HTMLDivElement>(null);
  useFormResetRestore(anchor, () => {
    setNewLead(intent.current.newLead);
    setWeeklyReport(intent.current.weeklyReport);
  });

  // Intent is recorded from onClick, never from onCheckedChange. Radix's reset
  // listener drives onCheckedChange too, so recording there would overwrite the
  // user's choice with the value being restored and make the restore a no-op.
  // onClick only ever fires for a real pointer or keyboard interaction.

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
        {/* A real navigation <a>, not a button styled like one — asChild gives
            it Button's classes from the primitive itself. */}
        <Button asChild variant="secondary">
          <Link href="/reset-password">Change password</Link>
        </Button>
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
          value={name}
          onChange={(event) => setName(event.target.value)}
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
        {/* Radix keeps a hidden native checkbox in the form for each of these,
            so formData.get("notify_new_lead") === "on" in the action still
            reads exactly as it did with a raw <input type="checkbox">. */}
        <div ref={anchor} className="space-y-2">
          <Checkbox
            name="notify_new_lead"
            checked={newLead}
            onClick={() => {
              intent.current.newLead = !newLead;
            }}
            onCheckedChange={(checked) => setNewLead(checked === true)}
            label="New lead alerts"
          />
          <Checkbox
            name="notify_weekly_report"
            checked={weeklyReport}
            onClick={() => {
              intent.current.weeklyReport = !weeklyReport;
            }}
            onCheckedChange={(checked) => setWeeklyReport(checked === true)}
            label="Weekly revenue report"
          />
        </div>
        <Button type="submit" variant="primary" loading={prefsIsPending}>
          {prefsIsPending ? "Saving…" : "Save preferences"}
        </Button>
      </form>
    </Card>
  );
}
