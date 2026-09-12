"use client";

import { useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/utils/cn";
import { useFormResetRestore } from "@/lib/forms/use-form-reset-restore";
import {
  EMPTY_LEAD_FORM,
  MOCK_FORM_MEMBERS,
  assigneeOptionLabel,
  type LeadFormValues,
} from "@/app/(dev)/shell/form/preview/mock-form";

// THE PART ALL THREE VARIANTS SHARE, so the pick compares CONTAINERS and
// nothing else — the same discipline pipeline/preview/CompCard.tsx applies to
// the card body.
//
// The axis under test in this prompt is where the form LIVES: a centred modal
// (today's shape), a right-hand drawer (the shape the picked detail panel
// already put on this surface), or an inline page section. The fields, their
// order, their labels, their controlled-state wiring and their submit row are
// byte-identical in all three, because a "difference" between two comps that
// is really a typo in one of them is worse than no comp at all.
//
// ONE COMPONENT, AND EDIT IS CREATE WITH VALUES IN IT. `initial` is the whole
// difference between the two modes. `mode` only changes two strings — the
// legend and the submit label — and is not allowed to change a single field,
// because a second design for editing is what this prompt was told not to
// produce.
//
// NOT WIRED TO ANYTHING. There is no `action={serverAction}` here and no
// import that could reach one: onSubmit preventDefaults. Stage 1 is comps
// over mock data, and a comp that could write a row is out of scope by the
// prompt's own fence.

export type FormMode = "create" | "edit";

export function FormBody({
  mode,
  initial = EMPTY_LEAD_FORM,
  className,
}: {
  mode: FormMode;
  initial?: LeadFormValues;
  className?: string;
}) {
  // CONTROLLED, NOT defaultValue, and that is load-bearing even here where no
  // Server Action runs. React 19 resets a <form> after its action returns,
  // failure included, and an uncontrolled form wipes what the operator typed
  // at the exact moment the error is telling them to fix it. The comp holds
  // the shipped pattern so that what is being judged is the real thing.
  // See CLAUDE.md § Form/Action Field Parity.
  const [values, setValues] = useState<LeadFormValues>(initial);
  // Radix's Checkbox drags itself back to its mount-time value on a form
  // reset, so the intent has to be recorded separately and re-asserted. It is
  // read from onClick, never onCheckedChange: Radix's own restore drives
  // onCheckedChange too, and would overwrite the value being restored.
  const starIntent = useRef(initial.is_starred);
  const anchor = useRef<HTMLFormElement>(null);
  // This form owns BOTH a <select> (assignee) and a Radix Checkbox (starred),
  // which are the two controls React does not restore by itself.
  useFormResetRestore(anchor, () => {
    setValues((current) => ({ ...current, is_starred: starIntent.current }));
  });

  const text = (name: "client_name" | "company" | "estimated_revenue" | "next_action_at") => ({
    name,
    value: values[name],
    onChange: (event: { target: { value: string } }) =>
      setValues((current) => ({ ...current, [name]: event.target.value })),
  });

  // An assignee who has left the org still has to be selectable-looking, or a
  // controlled <select> holding their id renders blank and the form silently
  // reports the lead as unassigned. Same reasoning as AssigneeLabel's
  // "Former member" row: the lead really is still pointed at somebody.
  const knownIds = MOCK_FORM_MEMBERS.map((m) => m.user_id);
  const orphaned = values.assigned_to && !knownIds.includes(values.assigned_to);

  return (
    <form
      ref={anchor}
      // No action, and no onSubmit that reaches a network. A comp form that
      // posted would be the one thing this prompt's fence rules out.
      onSubmit={(event) => event.preventDefault()}
      className={cn("flex flex-col gap-3", className)}
    >
      <Input label="Client name" required {...text("client_name")} />
      <Input label="Company" {...text("company")} />

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Estimated revenue"
          type="number"
          min="0"
          step="0.01"
          {...text("estimated_revenue")}
        />
        <Input label="Next action" type="datetime-local" {...text("next_action_at")} />
      </div>

      <Select
        label="Assigned to"
        value={values.assigned_to}
        onChange={(event) =>
          setValues((current) => ({ ...current, assigned_to: event.target.value }))
        }
      >
        <option value="">Unassigned</option>
        {MOCK_FORM_MEMBERS.map((member) => (
          <option key={member.user_id} value={member.user_id}>
            {assigneeOptionLabel(member.user_id)}
          </option>
        ))}
        {orphaned ? (
          <option value={values.assigned_to}>{assigneeOptionLabel(values.assigned_to)}</option>
        ) : null}
      </Select>

      <Checkbox
        name="is_starred"
        label="Star this lead"
        checked={values.is_starred}
        onClick={() => {
          starIntent.current = !values.is_starred;
        }}
        onCheckedChange={(next) =>
          setValues((current) => ({ ...current, is_starred: next === true }))
        }
      />

      <div className="flex items-center gap-2 pt-1">
        <Button type="submit" variant="primary">
          {mode === "create" ? "Create lead" : "Save changes"}
        </Button>
        <Button type="button" variant="ghost">
          Cancel
        </Button>
        {/* The only control here that DOES something, and it exists to make an
            invisible rule visible. React 19 calls form.reset() after a failed
            save; this fires the same event, so the reviewer can watch the
            select and the checkbox survive it instead of taking it on trust.
            The jsdom suite drives this same path. */}
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
