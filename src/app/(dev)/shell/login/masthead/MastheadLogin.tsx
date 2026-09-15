import { DEMO_HREF, type LoginFixture } from "@/app/(dev)/shell/login/preview/mock-login";
import { LoginForm } from "@/app/(dev)/shell/login/preview/LoginForm";
import { BrandMark } from "@/components/brand/BrandMark";
import { Button } from "@/components/ui/Button";
import { BRAND } from "@/lib/brand/copy";

// VARIANT MASTHEAD — the page already looks like the app it opens into.
// A 48px top bar with the mark and name on the left and the demo on the right,
// the same height and hairline as the shipped Quiet shell header. No card: the
// form sits straight on the canvas in a narrow column, a little above centre,
// with a footer that says why there is no sign-up link.
//
// The demo is quietest here — a ghost button in a corner. That is the idea
// under test, and also this variant's cost.
export function MastheadLogin({ fixture }: { fixture: LoginFixture }) {
  return (
    <div className="flex min-h-full flex-col bg-canvas-pure">
      <header className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-hairline px-4">
        <div className="flex min-w-0 items-center gap-2">
          <BrandMark height={24} />
          <span className="text-title truncate">{BRAND.name}</span>
        </div>
        <Button asChild variant="ghost" size="sm">
          <a href={DEMO_HREF}>View demo</a>
        </Button>
      </header>

      <div className="flex flex-1 items-start justify-center px-6 pt-16 pb-10">
        <div className="w-full max-w-xs">
          <h2 className="text-h1">Sign in</h2>
          <p className="text-body-sm mt-1 text-ink-muted">
            Use the email address your invitation was sent to.
          </p>
          <div className="mt-6">
            <LoginForm fixture={fixture} />
          </div>
        </div>
      </div>

      <footer className="text-caption shrink-0 border-t border-hairline px-4 py-3 text-ink-muted">
        {BRAND.tagline} Accounts are by invitation only, so there is no public sign-up.
      </footer>
    </div>
  );
}
