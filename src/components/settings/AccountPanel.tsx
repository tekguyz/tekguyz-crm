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
        {/* Radix keeps a hidden native checkbox in the form for each of these,
            so formData.get("notify_new_lead") === "on" in the action still
            reads exactly as it did with a raw <input type="checkbox">. */}
        <div className="space-y-2">
          <Checkbox
            name="notify_new_lead"
            defaultChecked={notifyNewLead}
            label="New lead alerts"
          />
          <Checkbox
            name="notify_weekly_report"
            defaultChecked={notifyWeeklyReport}
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
