import Link from "next/link";
import { signUp } from "@/lib/auth/actions";

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
          minLength={6}
          className="w-full rounded-xs border border-hairline bg-canvas-pure p-1.5 text-sm text-ink-main outline-none"
        />
        <button
          type="submit"
          className="w-full rounded-md bg-accent px-3.5 py-1 text-sm font-medium text-canvas-pure shadow-elevation-1 transition-shadow hover:shadow-elevation-2"
        >
          Sign up
        </button>
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
