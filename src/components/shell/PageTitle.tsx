"use client";

import { usePathname } from "next/navigation";

import { pageTitleFor } from "@/components/shell/nav-items";

// The header's left end: the name of the destination you are standing on. It
// is the nav label of the current route, read out of nav-items, so it can never
// disagree with the sidebar's active row.
//
// A <p>, NOT a heading. Four pages (Reports, Prospects and both importers)
// already render their own <h1>, and the other four render none; a header <h1>
// would give the first set two and change the heading outline of every page
// from here. This is chrome that orients, not document structure.
export function PageTitle() {
  const title = pageTitleFor(usePathname());
  if (!title) return null;

  return <p className="text-title truncate">{title}</p>;
}
