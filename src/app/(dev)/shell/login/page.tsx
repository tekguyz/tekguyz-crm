import Link from "next/link";
import { notFound } from "next/navigation";

import { VariantThumb } from "@/app/(dev)/shell/detail/preview/VariantThumb";
import { CenteredLogin } from "@/app/(dev)/shell/login/centered/CenteredLogin";
import { MastheadLogin } from "@/app/(dev)/shell/login/masthead/MastheadLogin";
import { EMPTY_LOGIN } from "@/app/(dev)/shell/login/preview/mock-login";
import { resolveLoginFixture } from "@/app/(dev)/shell/login/preview/resolve-login";
import { SplitLogin } from "@/app/(dev)/shell/login/split/SplitLogin";

// Index for the /login redesign — P1, Stage 1. Dev-only; see ../layout.tsx for
// all three gates and why the check is repeated in every page here.
//
// SHOWS, DOES NOT DESCRIBE — /shell/detail's rule. Every tile is the real
// variant at a real page width, scaled by the same imported VariantThumb.
// Two rows, because a sign-in page is opened on a phone as often as a laptop
// and the three variants differ most in how they stack.
//
// THE AXIS IS PLACEMENT, NOT THE FORM. All three render one shared
// preview/LoginForm.tsx. What differs is the frame around it and, above all,
// where the "View demo" way in lives: under the form, in its own pane, or in
// a top bar.
const VARIANTS = [
  {
    href: "/shell/login/centered",
    name: "Centered",
    nav: "Card, demo button under the form",
    cost: "Changes least, so it also fixes least: a stranger still gets no word about what the product is.",
    Component: CenteredLogin,
  },
  {
    href: "/shell/login/split",
    name: "Split",
    nav: "Brand pane beside the form",
    cost: "Half a laptop screen goes to copy a returning user reads once. On a phone the pitch and the demo drop under the form, and the mark with them.",
    Component: SplitLogin,
  },
  {
    href: "/shell/login/masthead",
    name: "Masthead",
    nav: "Top bar, no card",
    cost: "The demo is a ghost button in a corner, which is the least visible it has been since it shipped.",
    Component: MastheadLogin,
  },
];

const DESKTOP = { frameWidth: 1440, tileWidth: 440, tileHeight: 260 };

export default function LoginVariantsIndex() {
  if (process.env.NODE_ENV !== "development") notFound();

  const wrongPassword = resolveLoginFixture({ state: "error" });

  return (
    <main className="min-h-dvh bg-canvas-soft p-6 text-ink-main">
      <header className="mb-6">
        <Link href="/shell" className="text-body-sm text-accent underline underline-offset-2">
          ← Shell / IA comps
        </Link>
        <h1 className="text-display mt-1">/login redesign — Stage 1 comps</h1>
        <p className="text-body-md mt-1 max-w-[70ch] text-ink-muted">
          Three frames for the same sign-in form. Same fields, same banners,
          same &ldquo;View demo&rdquo; way in — only the layout around them
          changes. Click a tile to open it full size, where each variant also
          links to its wrong-password, notice and longest-values states.
        </p>
        <p className="text-caption mt-2 max-w-[70ch] text-ink-muted">
          <strong className="text-ink-main">Picked on 2026-09-15: Variant Split.</strong>{" "}
          Centered and Masthead are kept as the record of what Split was chosen
          over; they are not maintained past this date. Nothing here
          signs anyone in: the form cancels its own submit, the demo link does
          not point at /demo, and the real /login, /signup and /invite pages and
          the auth actions are untouched.
        </p>
      </header>

      <section>
        <h2 className="text-h2">Laptop, 1440 wide — empty</h2>
        <div className="mt-3 flex flex-wrap gap-5">
          {VARIANTS.map(({ Component, ...variant }) => (
            <VariantThumb
              key={variant.href}
              {...variant}
              name={`Variant ${variant.name}`}
              picked={variant.name === "Split"}
              {...DESKTOP}
            >
              <Component fixture={EMPTY_LOGIN} />
            </VariantThumb>
          ))}
        </div>
      </section>

      {/* NO PHONE ROW, on purpose. The first draft had one, and it lied: Split
          stacks at the `md:` VIEWPORT breakpoint, so a 390px frame inside a
          1440px window still drew two squeezed columns. /shell/form/full hit
          the same fact. Open a variant full size in a narrow window instead. */}
      <section className="mt-8">
        <h2 className="text-h2">Laptop, 1440 wide — wrong password</h2>
        <div className="mt-3 flex flex-wrap gap-5">
          {VARIANTS.map(({ Component, ...variant }) => (
            <VariantThumb
              key={variant.href}
              href={`${variant.href}?state=error`}
              name={`Variant ${variant.name}, wrong password`}
              nav="Error state"
              {...DESKTOP}
            >
              <Component fixture={wrongPassword} />
            </VariantThumb>
          ))}
        </div>
      </section>

      <section className="mt-8 max-w-[80ch]">
        <h2 className="text-h2">What each one costs</h2>
        <dl className="mt-2 flex flex-col">
          {VARIANTS.map((variant) => (
            <div key={variant.href} className="border-b border-hairline py-2 last:border-b-0">
              <dt className="text-title">{variant.name}</dt>
              <dd className="text-body-sm text-ink-muted">{variant.cost}</dd>
            </div>
          ))}
        </dl>
      </section>
    </main>
  );
}
