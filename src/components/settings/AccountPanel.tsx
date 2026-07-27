"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  updateDisplayName,
  updateNotificationPreferences,
  type AccountFormState,
} from "@/lib/account/actions";

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
    <section className="rounded-lg border border-hairline bg-canvas-pure p-6 shadow-elevation-1">
      <h2 className="mb-4 text-base font-semibold">Account</h2>

      <div className="space-y-2">
        <label className="block text-xs text-ink-muted">Email</label>
        <p className="text-sm text-ink-main">{userEmail}</p>
      </div>

      <div className="mt-4 border-t border-hairline pt-4">
        <label className="mb-1 block text-xs text-ink-muted">Password</label>
        <p className="mb-2 text-xs text-ink-muted">
          Set a new password for your account.
        </p>
        <Link
          href="/reset-password"
          className="inline-flex items-center justify-center rounded-md border border-hairline bg-canvas-pure px-3.5 py-1 text-sm font-medium text-ink-main transition-colors hover:bg-canvas-soft"
        >
          Change password
        </Link>
      </div>

      <form
        key={displayName ?? ""}
        action={nameAction}
        className="mt-4 space-y-3 border-t border-hairline pt-4"
      >
        {nameState?.error && (
          <p className="rounded-xs border border-hairline bg-pill-orange-bg px-3 py-2 text-sm text-pill-orange-fg">
            {nameState.error}
          </p>
        )}
        {nameState?.success && (
          <p className="rounded-xs border border-hairline bg-pill-green-bg px-3 py-2 text-sm text-pill-green-fg">
            Saved.
          </p>
        )}
        <div>
          <label className="mb-1 block text-xs text-ink-muted">Display name</label>
          <input
            name="display_name"
            defaultValue={displayName ?? ""}
            placeholder="Not set — using your email's first letter"
            className="w-full rounded-xs border border-hairline bg-canvas-pure p-1.5 text-sm text-ink-main outline-none placeholder:text-ink-muted"
          />
        </div>
        <button
          type="submit"
          disabled={nameIsPending}
          className="rounded-md bg-accent px-3.5 py-1 text-sm font-medium text-canvas-pure shadow-elevation-1 transition-shadow hover:shadow-elevation-2 disabled:opacity-60"
        >
          {nameIsPending ? "Saving…" : "Save name"}
        </button>
      </form>

      <form
        key={`${notifyNewLead}-${notifyWeeklyReport}`}
        action={prefsAction}
        className="mt-4 space-y-3 border-t border-hairline pt-4"
      >
        {prefsState?.error && (
          <p className="rounded-xs border border-hairline bg-pill-orange-bg px-3 py-2 text-sm text-pill-orange-fg">
            {prefsState.error}
          </p>
        )}
        {prefsState?.success && (
          <p className="rounded-xs border border-hairline bg-pill-green-bg px-3 py-2 text-sm text-pill-green-fg">
            Saved.
          </p>
        )}
        <label className="mb-1 block text-xs text-ink-muted">Email notifications</label>
        <p className="mb-2 text-xs text-ink-muted">
          Only applies while you&apos;re an owner or admin — these emails never go to members.
        </p>
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm text-ink-main">
            <input
              type="checkbox"
              name="notify_new_lead"
              defaultChecked={notifyNewLead}
              className="size-4 rounded-xs border-hairline"
            />
            New lead alerts
          </label>
          <label className="flex items-center gap-2 text-sm text-ink-main">
            <input
              type="checkbox"
              name="notify_weekly_report"
              defaultChecked={notifyWeeklyReport}
              className="size-4 rounded-xs border-hairline"
            />
            Weekly revenue report
          </label>
        </div>
        <button
          type="submit"
          disabled={prefsIsPending}
          className="rounded-md bg-accent px-3.5 py-1 text-sm font-medium text-canvas-pure shadow-elevation-1 transition-shadow hover:shadow-elevation-2 disabled:opacity-60"
        >
          {prefsIsPending ? "Saving…" : "Save preferences"}
        </button>
      </form>
    </section>
  );
}
