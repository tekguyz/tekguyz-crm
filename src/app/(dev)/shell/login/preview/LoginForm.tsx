"use client";

import { IconAlertCircle, IconInfoCircle } from "@tabler/icons-react";

import { FORGOT_HREF, type LoginFixture } from "@/app/(dev)/shell/login/preview/mock-login";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";

// THE ONE FORM all three variants render. The axis under test is where the
// form sits and what surrounds it, so its fields, labels, banners and submit
// row live here once — a visible difference between two tiles is then never a
// typo in one of them. Same rule as /shell/form's FormBody.
//
// SAME FIELD SET AS THE REAL PAGE: `email` and `password`, plus `next` as a
// hidden field on the real one. Stage 2 still owes its own parity diff against
// signIn's formData.get() calls; this comp does not prove it.
//
// SUBMIT IS CANCELLED. A <form> with no action submits as GET to the current
// URL, which would put the typed email into the address bar. There is no
// Server Action to post to here, by design.
//
// TWO DELIBERATE DIFFERENCES FROM THE SHIPPED PAGE, both for the review:
// - Fields carry visible labels, not placeholders only. A placeholder vanishes
//   the moment someone types, and it is the only name the shipped fields have.
// - The error banner uses --danger, not the orange pill pair. The pill palette
//   is for category dots and status badges only (CLAUDE.md § 1); the shipped
//   page's orange banner is outside that rule.
export function LoginForm({ fixture }: { fixture: LoginFixture }) {
  return (
    <div className="flex flex-col gap-4">
      {fixture.message ? (
        <p
          role="status"
          className="text-body-sm flex items-start gap-2 rounded-xs border border-hairline bg-canvas-soft px-3 py-2 text-ink-muted"
        >
          <IconInfoCircle aria-hidden className="mt-0.5 size-4 shrink-0" stroke={1.75} />
          <span className="min-w-0 break-words">{fixture.message}</span>
        </p>
      ) : null}

      {fixture.error ? (
        <p
          role="alert"
          className="text-body-sm flex items-start gap-2 rounded-xs border border-danger bg-canvas-pure px-3 py-2 text-danger"
        >
          <IconAlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" stroke={1.75} />
          <span className="min-w-0 break-words">{fixture.error}</span>
        </p>
      ) : null}

      <form onSubmit={(event) => event.preventDefault()} className="flex flex-col gap-3">
        <Input
          type="email"
          name="email"
          label="Email"
          autoComplete="email"
          defaultValue={fixture.email}
          required
        />

        {/* A wrapping <label>, because PasswordInput takes no id and this comp
            does not change a shared primitive to get one. The input is the
            label's first labelable descendant, so it is the one named. */}
        <label className="flex flex-col gap-1">
          <span className="text-label text-ink-muted">Password</span>
          <PasswordInput name="password" required />
        </label>

        <p className="text-body-sm text-right">
          <a href={FORGOT_HREF} className="text-accent underline underline-offset-2">
            Forgot password?
          </a>
        </p>

        <Button type="submit" variant="primary" className="w-full">
          Sign in
        </Button>
      </form>
    </div>
  );
}
