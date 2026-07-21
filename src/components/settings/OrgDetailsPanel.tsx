"use client";

import { useActionState } from "react";
import { updateOrgSettings, type OrgSettingsFormState } from "@/lib/organizations/actions";
import { CopyButton } from "@/components/ui/CopyButton";

const initialState: OrgSettingsFormState = null;

const TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
];

const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD"];

export function OrgDetailsPanel({
  orgName,
  orgTimezone,
  currencyFormat,
  webhookSecret,
  canEdit,
}: {
  orgName: string;
  orgTimezone: string;
  currencyFormat: string;
  webhookSecret: string | null;
  canEdit: boolean;
}) {
  const [state, formAction, isPending] = useActionState(updateOrgSettings, initialState);

  return (
    <section className="rounded-lg border border-hairline bg-canvas-pure p-6 shadow-elevation-1">
      <h2 className="mb-4 text-base font-semibold">Organization</h2>

      {canEdit ? (
        <form
          key={`${orgName}-${orgTimezone}-${currencyFormat}`}
          action={formAction}
          className="space-y-3"
        >
          {state?.error && (
            <p className="rounded-xs border border-hairline bg-pill-orange-bg px-3 py-2 text-sm text-pill-orange-fg">
              {state.error}
            </p>
          )}
          <div>
            <label className="mb-1 block text-xs text-ink-muted">Organization name</label>
            <input
              name="name"
              defaultValue={orgName}
              required
              className="w-full rounded-xs border border-hairline bg-canvas-pure p-1.5 text-sm text-ink-main outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-ink-muted">Timezone</label>
              <select
                name="timezone"
                defaultValue={orgTimezone}
                className="w-full rounded-xs border border-hairline bg-canvas-pure p-1.5 text-sm text-ink-main outline-none"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-ink-muted">Currency</label>
              <select
                name="currency_format"
                defaultValue={currencyFormat}
                className="w-full rounded-xs border border-hairline bg-canvas-pure p-1.5 text-sm text-ink-main outline-none"
              >
                {CURRENCIES.map((currency) => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-accent px-3.5 py-1 text-sm font-medium text-canvas-pure shadow-elevation-1 transition-shadow hover:shadow-elevation-2 disabled:opacity-60"
          >
            {isPending ? "Saving…" : "Save changes"}
          </button>
        </form>
      ) : (
        <dl className="space-y-2 text-sm">
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

      {canEdit && webhookSecret && (
        <div className="mt-4 border-t border-hairline pt-4">
          <label className="mb-1 block text-xs text-ink-muted">Webhook secret</label>
          <p className="mb-2 text-xs text-ink-muted">
            Used to authenticate inbound webhook requests once the ingestion endpoint is
            built (Phase 4). Only owners and admins can view this.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded-xs border border-hairline bg-canvas-soft px-2 py-1 text-xs text-ink-main">
              {webhookSecret}
            </code>
            <CopyButton text={webhookSecret} />
          </div>
        </div>
      )}
    </section>
  );
}
