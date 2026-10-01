import { cn } from "@/lib/utils/cn";

// The Landing Page's one screenshot: the real Pipeline, taken from the demo's
// Sample Data. Two captures of the same screen, so each visitor sees the app
// as it looks on their own device: the laptop board (1440x760) from `sm` up,
// and the phone list (390x760) below it, cropped to its first four cards. A laptop capture shrunk to 360px
// wide was unreadable. Files: public/landing/pipeline-*.png, 2x density.
//
// Background images driven by --landing-shot / --landing-shot-phone, not
// <img>, for the reason BrandMark is one: the theme is a class on <html>, and
// this codebase has no `dark:` variants (Tailwind maps those to
// prefers-color-scheme, which would ignore the theme toggle). globals.css
// swaps the URLs under .dark. The laptop box keeps its capture's own aspect
// ratio. The phone box is shorter than its capture on purpose: it ends just
// above the app's floating bottom nav and keeps the argument near the top of
// the page. bg-top crops the bottom, never letterboxes.
//
// One accessible image: the two boxes are the same picture at two sizes, and
// only one is ever displayed, so the other is display:none and out of the
// accessibility tree on its own.
const LABEL =
  "The TEKGUYZ CRM pipeline: leads in stages, each card showing a name, company, value and next date.";

export function AppScreenshot({ className }: { className?: string }) {
  return (
    <>
      <div
        role="img"
        aria-label={LABEL}
        data-shot="phone"
        className="mx-auto aspect-[390/570] w-full max-w-80 rounded-xl border border-hairline bg-canvas-soft bg-cover bg-top bg-no-repeat sm:hidden"
        style={{ backgroundImage: "var(--landing-shot-phone)" }}
      />
      <div
        role="img"
        aria-label={LABEL}
        data-shot="laptop"
        className={cn(
          "hidden aspect-[1440/760] w-full rounded-lg border border-hairline bg-canvas-soft bg-cover bg-top-left bg-no-repeat sm:block",
          className,
        )}
        style={{ backgroundImage: "var(--landing-shot)" }}
      />
    </>
  );
}
