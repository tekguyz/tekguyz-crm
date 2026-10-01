import { TryDemoButton } from "@/components/demo/TryDemoButton";
import { AppScreenshot } from "@/components/landing/AppScreenshot";
import { LandingFooter, LandingHeader } from "@/components/landing/LandingChrome";
import { BRAND, LANDING } from "@/lib/brand/copy";

// THE LANDING PAGE (#32). Picked by the owner on 2026-10-01 from two layouts;
// this one, "Split", shipped.
//
// Copy on the left, read top to bottom like a short brief: the promise, the
// button, then the three points as a numbered list. The app sits on the right
// and runs off the page's edge, so it reads as a window into something bigger
// rather than a framed picture.
//
// Below `lg` it stacks: copy, button, screenshot, points, button again — so a
// phone sees the app before it has to read the list, and is asked a second
// time once it has.
export function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col gap-12 overflow-x-clip bg-canvas-soft px-4 py-4 text-ink-main sm:px-8">
      <LandingHeader />

      {/* DOM order is the phone order: copy, screenshot, points. From `lg` the
          grid lifts the points under the copy and lets the screenshot span
          both rows on the right. One list, never a hidden second copy. */}
      <main className="grid flex-1 content-center gap-10 lg:grid-cols-[minmax(0,28rem)_minmax(0,1fr)] lg:gap-x-16 lg:gap-y-12">
        <section className="flex flex-col lg:col-start-1 lg:row-start-1 lg:self-end">
          <h1 className="text-hero text-balance">{BRAND.tagline}</h1>
          <p className="text-body-md mt-4 text-pretty text-ink-muted">{BRAND.description}</p>
          <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2">
            <TryDemoButton />
            <p className="text-body-sm max-w-56 text-ink-muted">{LANDING.demoNote}</p>
          </div>
          <p className="text-body-sm mt-3 text-ink-muted">{LANDING.demoLimits}</p>
        </section>

        {/* Wider than its column on purpose: the extra width carries it past
            the viewport edge, and the page clips the overflow. */}
        <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-center">
          <AppScreenshot className="lg:w-[125%] lg:max-w-none" />
        </div>

        <ol className="flex flex-col lg:col-start-1 lg:row-start-2 lg:self-start">
          {LANDING.points.map((point, index) => (
            <li
              key={point.title}
              className="grid grid-cols-[2rem_1fr] gap-x-2 border-t border-hairline py-4 last:border-b"
            >
              <span className="text-label pt-0.5 text-ink-muted tabular-nums">0{index + 1}</span>
              <div>
                <h2 className="text-h2">{point.title}</h2>
                <p className="text-body-md mt-1 text-ink-muted">{point.body}</p>
              </div>
            </li>
          ))}
        </ol>

        {/* The ask again, after the argument. Only where the page stacks: from
            `lg` the first button is still on screen beside the app. */}
        <div className="flex flex-col gap-2 lg:hidden">
          <TryDemoButton />
          <p className="text-body-sm text-ink-muted">{LANDING.demoNote}</p>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}

