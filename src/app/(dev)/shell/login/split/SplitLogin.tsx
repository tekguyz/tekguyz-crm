import { DEMO_HREF, type LoginFixture } from "@/app/(dev)/shell/login/preview/mock-login";
import { LoginForm } from "@/app/(dev)/shell/login/preview/LoginForm";
import { BrandMark } from "@/components/brand/BrandMark";
import { Button } from "@/components/ui/Button";
import { BRAND } from "@/lib/brand/copy";

// VARIANT SPLIT — the page says what the product is before it asks who you are.
// Left pane: the mark, BRAND.tagline and BRAND.description (imported, never
// retyped), and the demo as its own explained block. Right pane: the form,
// alone. Two columns from `md` up; below that it stacks.
//
// ON A PHONE THE FORM COMES FIRST. The brand pane is first in the DOM, so a
// screen reader meets the product before the form, but `order-last` moves it
// under the form below `md` — someone who came to sign in on a phone should
// not scroll past a pitch to do it.
export function SplitLogin({ fixture }: { fixture: LoginFixture }) {
  return (
    <div className="grid min-h-full bg-canvas-pure md:grid-cols-2">
      <section className="order-last flex flex-col gap-10 border-t border-hairline bg-canvas-soft p-6 md:order-first md:border-t-0 md:border-r md:p-10">
        <div className="flex items-center gap-2">
          {/* 28px, so BrandMark picks the reduced form on its own. */}
          <BrandMark height={28} />
          <span className="text-title">{BRAND.name}</span>
        </div>

        {/* One centred group, not three blocks pushed to the pane's edges.
            The first draft used justify-between, and at 800px tall the pitch
            and the demo ended up ~250px apart with nothing between them — the
            demo read as a stray footer rather than the answer to the pitch. */}
        <div className="flex max-w-md flex-1 flex-col justify-center gap-8">
          <div>
            <p className="text-display">{BRAND.tagline}</p>
            <p className="text-body-md mt-2 text-ink-muted">{BRAND.description}</p>
          </div>

          <div className="border-t border-hairline pt-6">
            <p className="text-label uppercase text-ink-muted">Just looking?</p>
            <p className="text-body-sm mt-1 text-ink-muted">
              The demo is a real workspace with sample data. It is read-only and
              needs no account.
            </p>
            <Button asChild variant="secondary" className="mt-3">
              <a href={DEMO_HREF}>View demo</a>
            </Button>
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-sm">
          <h2 className="text-h1">Sign in</h2>
          <p className="text-body-sm mt-1 text-ink-muted">Accounts are by invitation only.</p>
          <div className="mt-6">
            <LoginForm fixture={fixture} />
          </div>
        </div>
      </section>
    </div>
  );
}
