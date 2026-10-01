import { cn } from "@/lib/utils/cn";

// The Landing Page's one screenshot: the real Pipeline, taken from the demo's
// Sample Data at 1440x760 and 2x density (public/landing/pipeline-*.png).
//
// A background image driven by --landing-shot, not an <img>, for the reason
// BrandMark is one: the theme is a class on <html>, and this codebase has no
// `dark:` variants (Tailwind maps those to prefers-color-scheme, which would
// ignore the theme toggle). globals.css swaps the URL under .dark.
//
// The aspect ratio is the capture's own, so the box never crops or letterboxes.
export function AppScreenshot({ className }: { className?: string }) {
  return (
    <div
      role="img"
      aria-label="The TEKGUYZ CRM pipeline: leads in four stages, New, Discovery, Quoted and Active, each card showing a name, company, value and next date."
      className={cn(
        "aspect-[1440/760] w-full rounded-lg border border-hairline bg-canvas-soft bg-cover bg-top-left bg-no-repeat",
        className,
      )}
      style={{ backgroundImage: "var(--landing-shot)" }}
    />
  );
}
