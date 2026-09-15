import { LoginForm } from "@/components/auth/LoginForm";
import { BrandMark } from "@/components/brand/BrandMark";
import { Button } from "@/components/ui/Button";
import { BRAND } from "@/lib/brand/copy";

// /login — the /login redesign, Stage 2: Variant Split, wired 2026-09-15.
//
// ITS OWN ROUTE GROUP, NOT (auth). The (auth) layout centres its page inside a
// max-w-sm Card under a large mark, which is right for signup, forgot-password,
// reset-password and onboarding and cannot hold a two-pane page. A route group
// changes no URL, so /login is still /login to the middleware, to signIn's
// redirects and to every link; the other four screens keep their layout
// untouched.
//
// The page says what the product is before it asks who you are. The brand pane
// carries BRAND.tagline and BRAND.description (imported, never retyped) and
// the demo as its own explained block; the form stands alone beside it. Two
// columns from `md` up.
//
// ON A PHONE THE FORM COMES FIRST. The brand pane is first in the DOM, so a
// screen reader meets the product before the form, but `order-last` moves it
// under the form below `md` — someone who came to sign in on a phone should
// not scroll past a pitch to do it. CSS only; no viewport check in JS.
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string; next?: string }>;
}) {
  const { error, message, next } = await searchParams;

  return (
    <main className="grid min-h-dvh bg-canvas-pure text-ink-main md:grid-cols-2">
      <section className="order-last flex flex-col gap-10 border-t border-hairline bg-canvas-soft p-6 md:order-first md:border-t-0 md:border-r md:p-10">
        <div className="flex items-center gap-2">
          {/* 28px, so BrandMark picks the reduced form on its own. */}
          <BrandMark height={28} />
          <span className="text-title">{BRAND.name}</span>
        </div>

        {/* One centred group, not blocks pushed to the pane's edges: with
            justify-between the demo read as a stray footer at 800px tall. */}
        <div className="flex max-w-md flex-1 flex-col justify-center gap-8">
          <div>
            <p className="text-display">{BRAND.tagline}</p>
            <p className="text-body-md mt-2 text-ink-muted">{BRAND.description}</p>
          </div>

          {/* No self-serve signup link anywhere on this page: account creation
              is invite-only, and an invitee arrives through /invite/<token>.
              What a stranger gets instead is a way to see the product. */}
          <div className="border-t border-hairline pt-6">
            <p className="text-label uppercase text-ink-muted">Just looking?</p>
            <p className="text-body-sm mt-1 text-ink-muted">
              The demo is a real workspace with sample data. It is read-only and
              needs no account.
            </p>
            <Button asChild variant="secondary" className="mt-3">
              {/* A plain <a>, NOT next/link, and that is load-bearing. /demo is
                  a route handler that signs the visitor in, so a <Link> here
                  made Next prefetch it and mint a demo session for anyone who
                  merely LOOKED at this page — which on 2026-09-11 replaced a
                  signed-in operator's own session. The route now refuses RSC
                  requests too, but the link should not be asking. */}
              <a href="/demo">View demo</a>
            </Button>
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-sm">
          <h1 className="text-h1">Sign in</h1>
          <p className="text-body-sm mt-1 text-ink-muted">Accounts are by invitation only.</p>
          <div className="mt-6">
            <LoginForm error={error} message={message} next={next} />
          </div>
        </div>
      </section>
    </main>
  );
}
