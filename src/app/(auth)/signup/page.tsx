import Link from "next/link";
import { signUp } from "@/lib/auth/actions";
import { checkInviteToken } from "@/lib/invites/signup-gate";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";

/**
 * Invite-only account creation.
 *
 * Without a `token` naming a live PENDING invite this page renders no form at
 * all. Hiding the form is presentation only — `signUp` re-runs the same gate,
 * which is what actually closes the path.
 */
export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; token?: string }>;
}) {
  const { error, token } = await searchParams;
  const gate = await checkInviteToken(token);

  if (!gate.ok) {
    return (
      <div>
        <h1 className="mb-4 text-lg font-semibold">Invite required</h1>
        <p className="mb-4 text-sm text-ink-muted">
          {gate.reason} Accounts are created by invitation only.
        </p>
        <p className="text-sm text-ink-muted">
          <Link href="/login" className="font-medium text-accent underline">
            Back to sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold">Create an account</h1>

      <p className="mb-4 text-sm text-ink-muted">
        You&apos;ve been invited to{" "}
        <strong className="text-ink-main">{gate.organizationName}</strong>.
      </p>

      {error && (
        <p className="mb-4 rounded-xs border border-hairline bg-pill-orange-bg px-3 py-2 text-sm text-pill-orange-fg">
          {error}
        </p>
      )}

      <form action={signUp} className="space-y-3">
        <input type="hidden" name="token" value={token} />
        {/* readOnly and value, never defaultValue: the address is fixed by the
            invite, and the action rejects any other one anyway. */}
        <Input type="email" name="email" value={gate.email} readOnly />
        <PasswordInput name="password" placeholder="Password" required minLength={6} />
        <Button type="submit" variant="primary" className="w-full">
          Sign up
        </Button>
      </form>

      <p className="mt-4 text-sm text-ink-muted">
        Already have an account?{" "}
        <Link
          href={`/login?next=${encodeURIComponent(`/invite/${token}`)}`}
          className="font-medium text-accent underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
