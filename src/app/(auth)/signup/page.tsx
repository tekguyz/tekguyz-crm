import Link from "next/link";
import { signUp } from "@/lib/auth/actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold">Create an account</h1>

      {error && (
        <p className="mb-4 rounded-xs border border-hairline bg-pill-orange-bg px-3 py-2 text-sm text-pill-orange-fg">
          {error}
        </p>
      )}

      <form action={signUp} className="space-y-3">
        {next && <input type="hidden" name="next" value={next} />}
        <Input type="email" name="email" placeholder="Email" required />
        {/* PasswordInput, matching login and reset-password: this was the only
            one of the three password fields still raw, so the show/hide toggle
            was missing here and nowhere else. minLength stays 6 — that is the
            server action's own rule, not a styling detail. */}
        <PasswordInput name="password" placeholder="Password" required minLength={6} />
        <Button type="submit" variant="primary" className="w-full">
          Sign up
        </Button>
      </form>

      <p className="mt-4 text-sm text-ink-muted">
        Already have an account?{" "}
        <Link
          href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}
          className="font-medium text-accent underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
