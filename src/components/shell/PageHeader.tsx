import Link from "next/link";
import type { ReactNode } from "react";
import { IconChevronRight } from "@tabler/icons-react";

import { navItemFor } from "@/components/shell/nav-items";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils/cn";

// The page's half of the shell header (issue #47 step 8, Twenty style): the
// destination's icon, its name as the page's one <h1>, a record count, and the
// page's own action on the right. Help, search and identity follow it in
// Header.tsx.
//
// Each route fills it from its slot in src/app/(app)/@header/, so the count and
// the action are server-rendered with the page — no portal, no effect, no flash.
//
// The title is one step down the scale below `sm` (text-title, 14px): at 375px
// the 18px title truncated "Contacts" to "Cont…" beside its count and action.
//
// The icon and the name come from nav-items by href, so the header cannot
// disagree with the sidebar; an href the nav does not own throws.
//
// The icon wears a pill hue, spelled out so Tailwind's scanner sees every class.
const TONE: Record<string, string> = {
  "/": "text-pill-sky-fg",
  "/pipeline": "text-pill-purple-fg",
  "/contacts": "text-pill-teal-fg",
  "/prospects": "text-pill-orange-fg",
  "/import": "text-pill-pink-fg",
  "/reports": "text-pill-green-fg",
  "/settings": "text-ink-muted",
};

export function PageHeader({
  href,
  title,
  parent = false,
  count,
  actions,
}: {
  /** The nav destination this page belongs to. */
  href: string;
  /** Defaults to the destination's nav label. A nested route names itself. */
  title?: string;
  /** A nested route: the destination becomes a link back, then the title. */
  parent?: boolean;
  /** Usually a <Suspense>-wrapped HeaderCount, so a slow count never holds the page. */
  count?: ReactNode;
  actions?: ReactNode;
}) {
  const item = navItemFor(href);
  const Icon = item.icon;
  const icon = (
    <span aria-hidden="true" className={cn("flex shrink-0", TONE[href])}>
      <Icon className="size-5" stroke={1.75} />
    </span>
  );

  return (
    <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2">
        {parent ? (
          <>
            {/* On a phone only the icon shows; the name stays the link's
                accessible name. */}
            <Link
              href={item.href}
              className="text-h1 flex shrink-0 items-center gap-2 rounded-sm text-ink-muted hover:text-ink-main max-sm:-m-3 max-sm:p-3 max-sm:text-title"
            >
              {icon}
              <span className="max-sm:sr-only">{item.label}</span>
            </Link>
            <IconChevronRight aria-hidden="true" size={16} stroke={1.75} className="shrink-0 text-ink-muted" />
          </>
        ) : (
          icon
        )}
        <h1 className="text-h1 truncate max-sm:text-title">{title ?? item.label}</h1>
        {count}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}

// "20" beside the title. The noun is for a screen reader, which would
// otherwise hear a bare number after the heading.
export function HeaderCount({ n, noun }: { n: number; noun: string }) {
  return (
    <span className="text-body-md shrink-0 text-ink-muted tabular-nums">
      {n}
      <span className="sr-only"> {noun}</span>
    </span>
  );
}

// Holds the count's place while it streams, so the title does not shift.
export function HeaderCountSkeleton() {
  return <Skeleton className="h-4 w-6" />;
}
