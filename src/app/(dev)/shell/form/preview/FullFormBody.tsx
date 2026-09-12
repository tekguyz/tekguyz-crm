"use client";

import { useRef, useState } from "react";
import { IconChevronDown } from "@tabler/icons-react";

import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/utils/cn";
import { useFormResetRestore } from "@/lib/forms/use-form-reset-restore";
import { MOCK_FORM_MEMBERS, assigneeOptionLabel } from "@/app/(dev)/shell/form/preview/mock-form";
import {
  FULL_FORM_SECTIONS,
  type FullFormSectionId,
  type FullLeadFormValues,
} from "@/app/(dev)/shell/form/preview/mock-form-full";

// THE REAL FORM AT REAL SIZE — all eighteen fields, grouped, two-up, with the
// rarely-touched groups collapsed.
//
// This is NOT a fourth container candidate. It is the picked container
// (Variant Drawer) holding the real load, built because the review asked why
// eighteen fields have to live in one tall narrow column and whether the noise
// can be collapsed. The other three comps carry six fields and therefore
// cannot answer either question — six fields never scroll.
//
// Three separate ideas are being proposed here, and they should be judged
// separately rather than as one lump:
//
//   1. WIDTH. Two columns instead of one. Eighteen single-file fields is
//      eighteen rows; eighteen fields two-up is ten. This is the single
//      biggest reduction in height and it removes no information at all.
//   2. GROUPING. Four named groups with a full-bleed hairline between them —
//      the same section language the picked detail panel (Variant A) settled
//      on, so the read view and the edit view stop being two different
//      documents.
//   3. COLLAPSE. Two of the four groups start closed. This is the only one of
//      the three that HIDES anything, and it is the one most worth arguing
//      about — see FULL_FORM_SECTIONS for which groups and why.
//
// A CLOSED GROUP STILL CARRIES ITS FIELDS. Every input stays mounted and
// hidden with the `hidden` attribute rather than being unmounted, and that is
// load-bearing rather than an implementation detail: an unmounted input
// contributes nothing to FormData, so `updateLead` would read null for every
// collapsed column and NULL it on save. That is precisely the silent
// data-loss bug CLAUDE.md § Form/Action Field Parity exists to prevent, and
// collapsing sections is a brand-new way to cause it. Stage 2 must keep this
// property, and its field-parity diff must be run with every group CLOSED.
//
// NOT WIRED. No action, no import that could reach one; onSubmit preventDefaults.

function FormSection({
  id,
  label,
  count,
  open,
  onToggle,
  children,
}: {
  id: FullFormSectionId;
  label: string;
  count: number;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const panelId = `section-${id}`;

  return (
    <section className="border-b border-hairline last:border-b-0">
      {/* Ghost Button, justify-start, full width — a section header is a row,
          not a centred control. Nothing here suppresses the global
          :focus-visible ring. */}
      <Button
        type="button"
        variant="ghost"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        className="h-auto w-full justify-start gap-2 rounded-none px-4 py-3 text-ink-main"
      >
        <IconChevronDown
          aria-hidden
          stroke={1.75}
          className={cn("size-4 shrink-0 transition-transform", open ? "" : "-rotate-90")}
        />
        <span className="text-title min-w-0 truncate">{label}</span>
        {/* The count is what makes a closed group honest: it says how much is
            behind it before you open it. Borrowed from the picked detail
            panel's jump strip, which added counts for the same reason. */}
        <span className="text-body-sm tabular-nums text-ink-muted">{count}</span>
      </Button>

      {/* `hidden`, never unmounted — see the file comment. Tailwind's preflight
          does not defeat this: [hidden] stays display:none and the inputs keep
          contributing to FormData. */}
      <div id={panelId} hidden={!open} className="px-4 pb-4">
        {children}
      </div>
    </section>
  );
}

export function FullFormBody({
  initial,
  className,
}: {
  initial: FullLeadFormValues;
  className?: string;
}) {
  const [values, setValues] = useState<FullLeadFormValues>(initial);
  const [open, setOpen] = useState<Record<FullFormSectionId, boolean>>(() =>
    Object.fromEntries(
      FULL_FORM_SECTIONS.map((section) => [section.id, section.openByDefault]),
    ) as Record<FullFormSectionId, boolean>,
  );

  // Same React 19 form-reset machinery as the six-field body, and it matters
  // more here: this form owns THREE <select>s (status, assigned_to, outcome)
  // and a Radix Checkbox, which are exactly the controls React does not
  // restore by itself after form.reset().
  const starIntent = useRef(initial.is_starred);
  const anchor = useRef<HTMLFormElement>(null);
  useFormResetRestore(anchor, () => {
    setValues((current) => ({ ...current, is_starred: starIntent.current }));
  });

  type TextField = Exclude<keyof FullLeadFormValues, "is_starred">;
  const text = (name: TextField) => ({
    name,
    value: values[name],
    onChange: (event: { target: { value: string } }) =>
      setValues((current) => ({ ...current, [name]: event.target.value })),
  });
  const choice = (name: TextField) => ({
    name,
    value: values[name],
    onChange: (event: { target: { value: string } }) =>
      setValues((current) => ({ ...current, [name]: event.target.value })),
  });

  const knownIds = MOCK_FORM_MEMBERS.map((member) => member.user_id);
  const orphaned = values.assigned_to && !knownIds.includes(values.assigned_to);

  return (
    <form
      ref={anchor}
      onSubmit={(event) => event.preventDefault()}
      className={cn("flex min-h-0 flex-1 flex-col", className)}
    >
      <div className="min-h-0 flex-1 overflow-y-auto">
        <FormSection
          id="identity"
          label="Identity"
          count={7}
          open={open.identity}
          onToggle={() => setOpen((c) => ({ ...c, identity: !c.identity }))}
        >
          {/* Two-up wherever both halves are short. The full-width rows are the
              ones whose content is genuinely long — an email and a URL both
              run past a half column and would truncate for no reason. */}
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Client name" required {...text("client_name")} />
            <Input label="Company" {...text("company")} />
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Input label="Email" type="email" required {...text("email")} />
            <Input label="Phone" {...text("phone")} />
          </div>
          <div className="mt-3">
            <Input label="Website" {...text("website")} />
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Input label="Lead source" {...text("lead_source")} />
            <Input label="Service category" {...text("service_category")} />
          </div>
        </FormSection>

        <FormSection
          id="pipeline"
          label="Pipeline"
          count={5}
          open={open.pipeline}
          onToggle={() => setOpen((c) => ({ ...c, pipeline: !c.pipeline }))}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Select label="Status" {...choice("status")}>
              <option value="NEW">New</option>
              <option value="DISCOVERY">Discovery</option>
              <option value="QUOTED">Quoted</option>
              <option value="ACTIVE">Active</option>
            </Select>
            <Input
              label="Estimated revenue"
              type="number"
              min="0"
              step="0.01"
              {...text("estimated_revenue")}
            />
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Input
              label="Follow-up due"
              type="datetime-local"
              hint="Going Cold when overdue"
              {...text("next_action_at")}
            />
            <Select label="Assigned to" {...choice("assigned_to")}>
              <option value="">Unassigned</option>
              {MOCK_FORM_MEMBERS.map((member) => (
                <option key={member.user_id} value={member.user_id}>
                  {assigneeOptionLabel(member.user_id)}
                </option>
              ))}
              {orphaned ? (
                <option value={values.assigned_to}>
                  {assigneeOptionLabel(values.assigned_to)}
                </option>
              ) : null}
            </Select>
          </div>
          <div className="mt-3">
            <Checkbox
              name="is_starred"
              label="Starred"
              checked={values.is_starred}
              onClick={() => {
                starIntent.current = !values.is_starred;
              }}
              onCheckedChange={(next) =>
                setValues((current) => ({ ...current, is_starred: next === true }))
              }
            />
          </div>
        </FormSection>

        <FormSection
          id="reach"
          label="Address & social profiles"
          count={4}
          open={open.reach}
          onToggle={() => setOpen((c) => ({ ...c, reach: !c.reach }))}
        >
          {/* All four full width: an address and three profile URLs are the
              longest strings on the form, and halving their column only moves
              the truncation earlier. */}
          <div className="flex flex-col gap-3">
            <Input label="Physical address" {...text("physical_address")} />
            <Input
              label="Google Business Profile"
              placeholder="https://"
              {...text("social_google_business")}
            />
            <Input label="Facebook" placeholder="https://" {...text("social_facebook")} />
            <Input label="Instagram" placeholder="https://" {...text("social_instagram")} />
          </div>
        </FormSection>

        <FormSection
          id="outcome"
          label="Outcome"
          count={2}
          open={open.outcome}
          onToggle={() => setOpen((c) => ({ ...c, outcome: !c.outcome }))}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Select label="Outcome" {...choice("outcome")}>
              <option value="">Not closed</option>
              <option value="WON">Won</option>
              <option value="LOST">Lost</option>
              <option value="ABANDONED">Abandoned</option>
            </Select>
            <Input
              label="Actual revenue"
              type="number"
              min="0"
              step="0.01"
              hint="Only when closed"
              {...text("actual_revenue")}
            />
          </div>
        </FormSection>
      </div>

      {/* STICKY FOOTER, AND IT IS HALF THE ANSWER TO "I ALWAYS HAVE TO SCROLL
          TO THE BOTTOM". In the shipped modal the submit button is the last
          thing in a scrolling column, so reaching it means scrolling past
          every field whether or not you touched one. Here the form scrolls and
          the action bar does not. Even in the worst case — every group open,
          longest values, a short window — Save is one click from anywhere. */}
      <div className="flex shrink-0 items-center gap-2 border-t border-hairline bg-canvas-pure px-4 py-3">
        <Button type="submit" variant="primary">
          Save changes
        </Button>
        <Button type="button" variant="ghost">
          Cancel
        </Button>
        <Button
          type="reset"
          variant="ghost"
          size="sm"
          className="ml-auto"
          title="Fires the same form.reset() React 19 fires after a failed save"
        >
          Simulate failed save
        </Button>
      </div>
    </form>
  );
}
