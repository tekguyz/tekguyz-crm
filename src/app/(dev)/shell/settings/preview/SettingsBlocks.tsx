"use client";

import { useRef, useState } from "react";

import { BrandMark } from "@/components/brand/BrandMark";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { CURRENCIES, TIMEZONES, timezoneLabel } from "@/lib/organizations/org-options";
import { useFormResetRestore } from "@/lib/forms/use-form-reset-restore";
import {
  MOCK_SIGNING_SECRET,
  MOCK_WEBHOOK_URL,
  type OrgProfileValues,
} from "@/app/(dev)/shell/settings/preview/mock-org";

// THE THREE BLOCKS ALL THREE SETTINGS VARIANTS SHARE, so the pick compares
// LAYOUT and nothing else — the same discipline preview/FormBody.tsx applies
// to the form and preview/CompCard.tsx applies to the pipeline card.
//
// The axis under test is how a settings page is ARRANGED: one stacked card,
// a section rail beside the content, or a two-column split with each section's
// name and explanation on the left of its own controls. The three blocks below
// are identical in all three variants.
//
// SCOPE IS ORG PROFILE & BRANDING ONLY. Team, API keys and Account are the
// other three panels on the shipped /settings page and are deliberately absent
// — not stubbed, not reserved space, not a disabled nav row. Team role
// management in particular is out of this prompt's fence entirely.
//
// NOT WIRED. No `action={serverAction}`, and no import that could reach one.

/** The three editable columns on public.organizations. */
export function OrgProfileFields({ initial }: { initial: OrgProfileValues }) {
  // CONTROLLED, and the group owns two <select>s — the control React does not
  // restore after the form.reset() React 19 fires when an action returns.
  // See CLAUDE.md § Form/Action Field Parity and the hook's own comment.
  const [values, setValues] = useState<OrgProfileValues>(initial);
  const anchor = useRef<HTMLDivElement>(null);
  useFormResetRestore(anchor);

  return (
    <div ref={anchor} className="flex flex-col gap-3">
      <Input
        label="Organization name"
        name="name"
        required
        value={values.name}
        onChange={(event) => setValues((c) => ({ ...c, name: event.target.value }))}
      />
      <div className="grid grid-cols-2 gap-3">
        <Select
          label="Timezone"
          name="timezone"
          value={values.timezone}
          onChange={(event) => setValues((c) => ({ ...c, timezone: event.target.value }))}
        >
          {/* The value stays the IANA id the real action validates against and
              only the label is humanized — org-options.ts is imported, never
              re-listed, so the comp cannot offer a zone the action rejects. */}
          {TIMEZONES.map((tz) => (
            <option key={tz} value={tz}>
              {timezoneLabel(tz)}
            </option>
          ))}
        </Select>
        <Select
          label="Currency"
          name="currency_format"
          value={values.currency_format}
          onChange={(event) => setValues((c) => ({ ...c, currency_format: event.target.value }))}
        >
          {CURRENCIES.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}

/**
 * Branding, which on this surface means the shipped mark and its two rules —
 * NOT an upload control.
 *
 * The mark is rendered by src/components/brand/BrandMark.tsx as shipped, which
 * is the only place the light/dark asset swap and the 32px reduced-form
 * cutover are encoded. Both sizes are shown because the rule is invisible at
 * one size: the second tile is below the cutover and is a different asset.
 *
 * There is no per-org logo column, no storage bucket and no upload action, so
 * there is no control here for one. Drawing one would be inventing a data
 * model, and this prompt's fence rules that out.
 */
export function BrandingBlock() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col items-center gap-1">
          <div className="flex size-16 items-center justify-center rounded-md border border-hairline bg-canvas-pure">
            <BrandMark height={40} />
          </div>
          <span className="text-caption text-ink-muted">Full · 40px</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <div className="flex size-16 items-center justify-center rounded-md border border-hairline bg-canvas-pure">
            <BrandMark height={24} />
          </div>
          <span className="text-caption text-ink-muted">Reduced · 24px</span>
        </div>
        {/* min-w on the flex child, not just flex-1: at a narrow container the
            paragraph is the item that would otherwise shrink to a single
            letter per line beside two fixed 64px tiles. */}
        <p className="text-caption min-w-[18ch] flex-1 text-ink-muted">
          The mark swaps asset with the theme and drops to its reduced form
          below 32px. Both rules live in one component, so nothing here can get
          them wrong.
        </p>
      </div>
      <p className="text-body-sm text-ink-muted">
        There is no per-organization logo. Uploading one would need a column, a
        bucket and an upload path that do not exist, so this section shows what
        the app already ships rather than offering a control that cannot work.
      </p>
    </div>
  );
}

/**
 * The inbound webhook pair, carried over from the shipped OrgDetailsPanel
 * because it lives on this panel today and moving it is a decision this prompt
 * was not asked to make.
 *
 * The URL and the secret are shown as two separate things on purpose: the URL
 * is keyed on organization_id, is not a credential, and does not change when
 * the key rotates. Presenting them as one rotatable blob teaches the wrong
 * model of the protocol.
 */
export function WebhookBlock() {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <div className="text-label mb-1 text-ink-muted">Endpoint URL</div>
        <p className="text-caption mb-2 text-ink-muted">
          Not a credential. Safe to paste into a ticket or a config file.
        </p>
        <div className="flex items-center gap-2">
          {/* min-w-0 on the flex child, not just `truncate`: a long URL in a
              flex row refuses to shrink below its content without it, and the
              copy button is pushed off the panel instead. */}
          <code className="text-caption min-w-0 flex-1 truncate rounded-xs border border-hairline bg-canvas-soft px-2 py-1 text-ink-main">
            {MOCK_WEBHOOK_URL}
          </code>
          <CopyButton text={MOCK_WEBHOOK_URL} />
        </div>
      </div>

      <div>
        <div className="text-label mb-1 text-ink-muted">Signing secret</div>
        <p className="text-caption mb-2 text-ink-muted">
          Treat this like a password. It is never sent with a request — it only
          keys the signature. Owners and admins only.
        </p>
        <div className="flex items-center gap-2">
          <code className="text-caption min-w-0 flex-1 truncate rounded-xs border border-hairline bg-canvas-soft px-2 py-1 text-ink-main">
            {MOCK_SIGNING_SECRET}
          </code>
          <CopyButton text={MOCK_SIGNING_SECRET} />
        </div>
      </div>

      <div>
        <Button type="button" variant="secondary">
          Rotate signing secret
        </Button>
      </div>
    </div>
  );
}
