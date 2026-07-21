import Link from "next/link";
import { signIn } from "@/lib/auth/actions";

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
        <input
          type="email"
          name="email"
          placeholder="Email"
          required
          className="w-full rounded-xs border border-hairline bg-canvas-pure p-1.5 text-sm text-ink-main outline-none"
        />
        <input
          type="password"
          name="password"
          placeholder="Password"
          required
          className="w-full rounded-xs border border-hairline bg-canvas-pure p-1.5 text-sm text-ink-main outline-none"
        />
        <button
          type="submit"
          className="w-full rounded-md bg-accent px-3.5 py-1 text-sm font-medium text-canvas-pure shadow-elevation-1 transition-shadow hover:shadow-elevation-2"
        >
          Sign in
        </button>
      </form>

      <p className="mt-4 text-sm text-ink-muted">
        No account?{" "}
        <Link
          href={next ? `/signup?next=${encodeURIComponent(next)}` : "/signup"}
          className="font-medium text-accent underline"
        >
          Sign up
        </Link>
      </p>
    </div>
  );
}
