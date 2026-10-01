import Link from "next/link";

import { BrandMark } from "@/components/brand/BrandMark";
import { Button } from "@/components/ui/Button";
import { BRAND, LANDING } from "@/lib/brand/copy";

// The Landing Page's top bar and footer.

export function LandingHeader() {
  return (
    <header className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        {/* 28px, so BrandMark picks the reduced form on its own. */}
        <BrandMark height={28} />
        <span className="text-title">{BRAND.name}</span>
      </div>
      {/* A real customer's way in. No sign-up link: accounts are invite-only. */}
      <Button asChild variant="ghost" className="max-sm:h-11">
        <Link href="/login">Sign in</Link>
      </Button>
    </header>
  );
}

export function LandingFooter() {
  return (
    <footer className="text-body-sm flex flex-wrap items-center justify-between gap-2 border-t border-hairline text-ink-muted">
      <span>{BRAND.name}</span>
      {/* min-h-11: a 12px line of text is a 16px target; this makes it a thumb. */}
      <a
        href={LANDING.builtBy.href}
        className="inline-flex min-h-11 items-center underline-offset-2 hover:text-ink-main hover:underline"
      >
        {LANDING.builtBy.label}
      </a>
    </footer>
  );
}
