import { IconCheck } from "@tabler/icons-react";
import Link from "next/link";

import { LoginForm } from "@/components/auth/LoginForm";
import { BrandMark } from "@/components/brand/BrandMark";
import { BRAND, LANDING } from "@/lib/brand/copy";

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
// ON A PHONE THE FORM IS ALL THERE IS (DEMO-STANDARD.md item 9). The brand pane
// is `hidden` below `md`, so it is out of the accessibility tree there too —
// someone who came to sign in on a phone should not scroll past a pitch to do
// it. CSS only; no viewport check in JS. On desktop the pane carries the
// product's name and line, the Landing Page's own three points (imported from
// LANDING, never retyped), one real capture, and the link to the Landing Page.
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string; next?: string }>;
}) {
  const { error, message, next } = await searchParams;

  return (
    <main className="grid min-h-dvh bg-canvas-pure text-ink-main md:h-dvh md:grid-cols-2 md:grid-rows-[minmax(0,1fr)]">
      <section className="hidden flex-col gap-6 overflow-y-auto border-r border-hairline bg-canvas-soft p-10 md:flex">
        <div className="flex items-center gap-2">
          {/* 28px, so BrandMark picks the reduced form on its own. */}
          <BrandMark height={28} />
          <span className="text-title">{BRAND.name}</span>
        </div>

        {/* One centred group, not blocks pushed to the pane's edges: with
            justify-between the demo read as a stray footer at 800px tall. */}
        <div className="flex min-h-0 w-full max-w-lg flex-1 flex-col justify-center gap-6">
          <div>
            <p className="text-display">{BRAND.tagline}</p>
            <p className="text-body-md mt-2 text-ink-muted">{BRAND.description}</p>
          </div>

          <ul className="flex flex-col gap-2">
            {LANDING.points.map((point) => (
              <li key={point.title} className="text-body-sm flex items-center gap-2">
                <IconCheck className="size-4 shrink-0 text-ink-muted" stroke={1.75} aria-hidden />
                {point.title}
              </li>
            ))}
          </ul>

          {/* A real capture of the Pipeline (showcase/pipeline-desktop-light,
              1440x900), never a drawn mockup. A background image in a role="img"
              box, as the Landing Page's AppScreenshot does it. */}
          {/* The wrapper shrinks when the window is short and the picture is
              capped to it, so the box gets wider than its capture and bg-cover
              crops the bottom, not the sides. Both halves then fit one screen:
              the link below the picture is never scrolled off. */}
          <div className="min-h-40 shrink">
            <div
              role="img"
              aria-label="The TEKGUYZ CRM pipeline: leads in stages, each card showing a name, value and next date."
              className="aspect-[1440/900] max-h-full w-full rounded-lg border border-hairline bg-canvas-pure bg-cover bg-top-left bg-no-repeat"
              style={{ backgroundImage: "url(/login/pipeline-desktop-light.webp)" }}
            />
          </div>

          {/* No self-serve signup link anywhere on this page: account creation
              is invite-only, and an invitee arrives through /invite/<token>.
              What a stranger gets instead is a way to see the product. */}
          <div className="shrink-0 border-t border-hairline pt-5">
            <p className="text-label uppercase text-ink-muted">Just looking?</p>
            <p className="text-body-sm mt-1 text-ink-muted">
              The demo is your own workspace with sample data. It needs no
              account.
            </p>
            {/* A plain link, not the demo's door: the door is the Landing
                Page's button (#32), and a link must never start the demo. */}
            <Link
              href="/"
              className="text-body-sm mt-3 inline-block text-accent underline underline-offset-2"
            >
              See what it does →
            </Link>
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center overflow-y-auto p-6 md:p-10">
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
