import { createOrganization } from "@/lib/auth/actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div>
      <h1 className="mb-1 text-lg font-semibold">Create your organization</h1>
      <p className="mb-4 text-sm text-ink-muted">
        You&apos;ll be the owner of this workspace.
      </p>

      {error && (
        <p className="mb-4 rounded-xs border border-hairline bg-pill-orange-bg px-3 py-2 text-sm text-pill-orange-fg">
          {error}
        </p>
      )}

      <form action={createOrganization} className="space-y-3">
        <Input type="text" name="name" placeholder="Organization name" required />
        <Button type="submit" variant="primary" className="w-full">
          Create organization
        </Button>
      </form>
    </div>
  );
}
