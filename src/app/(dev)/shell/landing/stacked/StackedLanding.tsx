import { TryDemoButton } from "@/components/demo/TryDemoButton";
import { AppScreenshot } from "@/components/landing/AppScreenshot";
import { LandingFooter, LandingHeader } from "@/components/landing/LandingChrome";
import { BRAND, LANDING } from "@/lib/brand/copy";

// VERSION A — STACKED. One centred column: the promise, the button, then the
// app itself, wide, then the three points in a row under it. The screenshot
// is the biggest thing on the page; the copy only has to get you to it.
//
// The button is the real door (src/lib/demo/start-demo.ts). A press while
// signed in keeps the session and goes home, so it is safe even on a comp.
export function StackedLanding() {
  return (
    <div className="flex min-h-dvh flex-col gap-12 bg-canvas-pure px-4 py-4 text-ink-main sm:px-8 md:gap-16">
      {/* Held to the content's width, so the mark lines up with the
          screenshot's left edge instead of floating at the window's. */}
      <div className="mx-auto w-full max-w-5xl">
        <LandingHeader />
      </div>

      <main className="mx-auto flex w-full max-w-5xl flex-col items-center gap-12 md:gap-16">
        <section className="flex max-w-2xl flex-col items-center text-center">
          <h1 className="text-hero text-balance">{BRAND.tagline}</h1>
          <p className="text-body-md mt-4 max-w-md text-pretty text-ink-muted">
            {BRAND.description}
          </p>
          <TryDemoButton variant="primary" size="lg" className="mt-8" />
          <p className="text-caption mt-3 text-ink-muted">{LANDING.demoNote}</p>
        </section>

        <AppScreenshot />

        <ul className="grid w-full gap-8 md:grid-cols-3 md:gap-6">
          {LANDING.points.map((point) => (
            <li key={point.title} className="border-t border-hairline pt-4">
              <h2 className="text-h2">{point.title}</h2>
              <p className="text-body-md mt-2 text-ink-muted">{point.body}</p>
            </li>
          ))}
        </ul>
      </main>

      <div className="mx-auto w-full max-w-5xl">
        <LandingFooter />
      </div>
    </div>
  );
}
