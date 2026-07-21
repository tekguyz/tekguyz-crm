import { createOrganization } from "@/lib/auth/actions";

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
        <input
          type="text"
          name="name"
          placeholder="Organization name"
          required
          className="w-full rounded-xs border border-hairline bg-canvas-pure p-1.5 text-sm text-ink-main outline-none"
        />
        <button
          type="submit"
          className="w-full rounded-md bg-accent px-3.5 py-1 text-sm font-medium text-canvas-pure shadow-elevation-1 transition-shadow hover:shadow-elevation-2"
        >
          Create organization
        </button>
      </form>
    </div>
  );
}
