import { resetPassword } from "@/lib/auth/actions";
import { Button } from "@/components/ui/Button";
import { PasswordInput } from "@/components/ui/PasswordInput";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div>
      <h1 className="mb-1 text-lg font-semibold">Set a new password</h1>
      <p className="mb-4 text-sm text-ink-muted">Choose a new password for your account.</p>

      {error && (
        <p className="mb-4 rounded-xs border border-hairline bg-pill-orange-bg px-3 py-2 text-sm text-pill-orange-fg">
          {error}
        </p>
      )}

      <form action={resetPassword} className="space-y-3">
        <PasswordInput name="password" placeholder="New password" required minLength={8} />
        <PasswordInput name="confirmPassword" placeholder="Confirm new password" required minLength={8} />
        <Button type="submit" variant="primary" className="w-full">
          Update password
        </Button>
      </form>
    </div>
  );
}
