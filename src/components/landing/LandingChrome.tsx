import Link from "next/link";

import { BrandMark } from "@/components/brand/BrandMark";
import { Button } from "@/components/ui/Button";
import { BRAND, LANDING } from "@/lib/brand/copy";

// The Landing Page's top bar and footer. Both versions share them, so the
// comparison is about the middle of the page, not about where Sign in lives.

export function LandingHeader() {
  return (
    <header className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        {/* 28px, so BrandMark picks the reduced form on its own. */}
        <BrandMark height={28} />
        <span className="text-title">{BRAND.name}</span>
      </div>
      {/* A real customer's way in. No sign-up link: accounts are invite-only. */}
      <Button asChild variant="ghost">
        <Link href="/login">Sign in</Link>
      </Button>
    </header>
  );
}

export function LandingFooter() {
  return (
    <footer className="text-caption flex flex-wrap items-center justify-between gap-2 border-t border-hairline pt-6 text-ink-muted">
      <span>{BRAND.name}</span>
      <a
        href={LANDING.builtBy.href}
        className="underline-offset-2 hover:text-ink-main hover:underline"
      >
        {LANDING.builtBy.label}
      </a>
    </footer>
  );
}
