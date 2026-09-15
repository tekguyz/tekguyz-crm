import { DEMO_HREF, type LoginFixture } from "@/app/(dev)/shell/login/preview/mock-login";
import { LoginForm } from "@/app/(dev)/shell/login/preview/LoginForm";
import { BrandMark } from "@/components/brand/BrandMark";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { BRAND } from "@/lib/brand/copy";

// VARIANT CENTERED — the shipped page, tightened rather than re-thought.
// Mark above one centred card, exactly where it is today. What changes is the
// demo: a line of muted text with a link becomes a full-width secondary
// button under an "or" rule, so a stranger sees two equal-width ways forward
// and the primary one is still the only filled button on the page.
export function CenteredLogin({ fixture }: { fixture: LoginFixture }) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-canvas-soft p-6">
      <div className="mb-6 flex flex-col items-center gap-3">
        <BrandMark height={52} />
        <p className="text-title">{BRAND.name}</p>
      </div>

      <Card className="w-full max-w-sm p-6">
        {/* h2, not h1: the comp frame above already owns the page's h1. The
            real page keeps its own h1 when this is wired. */}
        <h2 className="text-h1">Sign in</h2>
        <div className="mt-4">
          <LoginForm fixture={fixture} />
        </div>

        <div className="text-caption my-4 flex items-center gap-3 text-ink-muted">
          <span aria-hidden="true" className="h-px flex-1 bg-hairline" />
          or
          <span aria-hidden="true" className="h-px flex-1 bg-hairline" />
        </div>

        <Button asChild variant="secondary" className="w-full">
          <a href={DEMO_HREF}>View the read-only demo</a>
        </Button>
      </Card>

      <p className="text-caption mt-4 text-ink-muted">Accounts are by invitation only.</p>
    </div>
  );
}
