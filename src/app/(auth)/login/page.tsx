import Link from "next/link";
import { signIn } from "@/lib/auth/actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string; next?: string }>;
}) {
  const { error, message, next } = await searchParams;

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold">Sign in</h1>

      {message && (
        <p className="mb-4 rounded-xs border border-hairline bg-canvas-soft px-3 py-2 text-sm text-ink-muted">
          {message}
        </p>
      )}
      {error && (
        <p className="mb-4 rounded-xs border border-hairline bg-pill-orange-bg px-3 py-2 text-sm text-pill-orange-fg">
          {error}
        </p>
      )}

      <form action={signIn} className="space-y-3">
        {next && <input type="hidden" name="next" value={next} />}
        <Input type="email" name="email" placeholder="Email" required />
        <PasswordInput name="password" placeholder="Password" required />
        <p className="text-right text-sm">
          <Link href="/forgot-password" className="text-accent underline">
            Forgot password?
          </Link>
        </p>
        <Button type="submit" variant="primary" className="w-full">
          Sign in
        </Button>
      </form>

      {/* No self-serve signup link: account creation is invite-only, and an
          invitee arrives through /invite/<token>, never through here. What a
          stranger landing on the production URL gets instead is a way to
          actually see the product. */}
      <p className="mt-4 text-sm text-ink-muted">
        Just looking?{" "}
        <Link href="/demo" className="font-medium text-accent underline">
          View demo
        </Link>
      </p>

    </div>
  );
}
