"use client";

import { useId } from "react";
import Link from "next/link";
import { IconAlertCircle, IconInfoCircle } from "@tabler/icons-react";

import { useLoginEmail } from "@/components/auth/LoginEmailProvider";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { signIn } from "@/lib/auth/actions";

// The real sign-in form, ported from the /shell/login Stage 1 comp that won
// (Variant Split). The comp cancelled its submit; this one posts to signIn.
//
// FIELD SET, diffed against signIn's formData.get() calls: `email`,
// `password`, and `next` as a hidden field when the URL carries one. Nothing
// else is read, nothing else is rendered.
//
// THE EMAIL IS CONTROLLED, AND ITS STATE LIVES IN THE LAYOUT. React 19's
// form.reset() after the action would wipe an uncontrolled field, and signIn's
// error redirect remounts this whole page, which would wipe local state too.
// useLoginEmail() reads state held by (login)/layout.tsx, which survives both,
// so the address the user typed is still in the box when the error asks them
// to try again. See LoginEmailProvider.tsx for the measurement.
//
// THE PASSWORD IS DELIBERATELY NOT CONTROLLED. After a failed attempt the
// field being empty is the expected behaviour, not a lost edit, so there is
// nothing for state to preserve.
//
// BANNERS: the notice is neutral, the error uses --danger. The shipped page
// used to paint the error with the orange pill pair, which the pill palette's
// own rule never allowed outside category dots and status badges.
export function LoginForm({
  error,
  message,
  next,
}: {
  error?: string;
  message?: string;
  next?: string;
}) {
  const [email, setEmail] = useLoginEmail();
  const passwordId = useId();

  return (
    <div className="flex flex-col gap-4">
      {message ? (
        <p
          role="status"
          className="text-body-sm flex items-start gap-2 rounded-xs border border-hairline bg-canvas-soft px-3 py-2 text-ink-muted"
        >
          <IconInfoCircle aria-hidden className="mt-0.5 size-4 shrink-0" stroke={1.75} />
          <span className="min-w-0 break-words">{message}</span>
        </p>
      ) : null}

      {error ? (
        <p
          role="alert"
          className="text-body-sm flex items-start gap-2 rounded-xs border border-danger bg-canvas-pure px-3 py-2 text-danger"
        >
          <IconAlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" stroke={1.75} />
          <span className="min-w-0 break-words">{error}</span>
        </p>
      ) : null}

      <form action={signIn} className="flex flex-col gap-3">
        {next ? <input type="hidden" name="next" value={next} /> : null}

        <Input
          type="email"
          name="email"
          label="Email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />

        <div className="flex flex-col gap-1">
          <label htmlFor={passwordId} className="text-label text-ink-muted">
            Password
          </label>
          <PasswordInput
            id={passwordId}
            name="password"
            autoComplete="current-password"
            required
          />
        </div>

        <p className="text-body-sm text-right">
          <Link href="/forgot-password" className="text-accent underline underline-offset-2">
            Forgot password?
          </Link>
        </p>

        <Button type="submit" variant="primary" className="w-full">
          Sign in
        </Button>
      </form>
    </div>
  );
}
