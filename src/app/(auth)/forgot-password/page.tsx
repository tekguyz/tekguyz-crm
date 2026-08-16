import Link from "next/link";
import { requestPasswordReset } from "@/lib/auth/actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const { message } = await searchParams;

  return (
    <div>
      <h1 className="mb-1 text-lg font-semibold">Reset your password</h1>
      <p className="mb-4 text-sm text-ink-muted">
        Enter your email and we&apos;ll send you a link to reset your password.
      </p>

      {message && (
        <p className="mb-4 rounded-xs border border-hairline bg-canvas-soft px-3 py-2 text-sm text-ink-muted">
          {message}
        </p>
      )}

      <form action={requestPasswordReset} className="space-y-3">
        <Input type="email" name="email" placeholder="Email" required />
        <Button type="submit" variant="primary" className="w-full">
          Send reset link
        </Button>
      </form>

      <p className="mt-4 text-sm text-ink-muted">
        <Link href="/login" className="font-medium text-accent underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
