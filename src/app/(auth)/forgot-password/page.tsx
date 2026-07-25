import Link from "next/link";
import { requestPasswordReset } from "@/lib/auth/actions";

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
        <input
          type="email"
          name="email"
          placeholder="Email"
          required
          className="w-full rounded-xs border border-hairline bg-canvas-pure p-1.5 text-sm text-ink-main outline-none"
        />
        <button
          type="submit"
          className="w-full rounded-md bg-accent px-3.5 py-1 text-sm font-medium text-canvas-pure shadow-elevation-1 transition-shadow hover:shadow-elevation-2"
        >
          Send reset link
        </button>
      </form>

      <p className="mt-4 text-sm text-ink-muted">
        <Link href="/login" className="font-medium text-accent underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
