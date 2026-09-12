import Link from "next/link";
import { notFound } from "next/navigation";

import {
  DRAWER_WIDTHS,
  FullDrawerForm,
  type DrawerWidth,
} from "@/app/(dev)/shell/form/full/FullDrawerForm";
import {
  MOCK_FULL_FORM,
  MOCK_FULL_FORM_LONG,
} from "@/app/(dev)/shell/form/preview/mock-form-full";

const WIDTH_KEYS = Object.keys(DRAWER_WIDTHS) as DrawerWidth[];

function resolveWidth(value: string | undefined): DrawerWidth {
  return WIDTH_KEYS.includes(value as DrawerWidth) ? (value as DrawerWidth) : "2xl";
}

export default async function FullFormPage({
  searchParams,
}: {
  searchParams: Promise<{ width?: string; long?: string }>;
}) {
  // Repeated from ../../layout.tsx on purpose, and this is the check that
  // matters. A layout that throws does NOT stop its page rendering — React
  // renders the two concurrently — so with the gate only in the layout,
  // `next build` still prerenders the whole comp into the 404 response.
  if (process.env.NODE_ENV !== "development") notFound();

  const params = await searchParams;
  const width = resolveWidth(params.width);
  const initial = params.long === "1" ? MOCK_FULL_FORM_LONG : MOCK_FULL_FORM;

  return (
    <main className="flex h-dvh flex-col bg-canvas-soft text-ink-main">
      <div className="shrink-0 border-b border-hairline bg-canvas-pure px-6 py-3">
        <Link href="/shell/form" className="text-body-sm text-accent underline underline-offset-2">
          ← All lead-form variants
        </Link>
        <h1 className="text-h1 mt-1">Drawer at real scale — all 18 fields</h1>
        <p className="text-body-sm max-w-[75ch] text-ink-muted">
          Not a fourth container. This is the picked drawer holding the real
          edit form — the same eighteen fields the five{" "}
          <code className="text-body-sm">edit-form/</code> groups share today —
          grouped into four sections, laid out two-up, with the two
          rarely-touched groups closed and the action bar pinned.
        </p>
        <p className="text-caption mt-2 max-w-[75ch] text-ink-muted">
          <strong className="text-ink-main">Measured at 1440×800, and one
          result is the opposite of what was pitched:</strong> switching the
          width below from 448px to 768px changes the height by{" "}
          <strong className="text-ink-main">zero pixels</strong>. The two-column
          grid runs off the <code className="text-caption">sm:</code> viewport
          breakpoint, not the panel, so it is already two columns at 448px.
          Width buys comfort, not height. What buys height is the grid (18 rows
          become 10) and the collapse (425px of overflow becomes 92px). What
          removes the &ldquo;scroll to the bottom to save&rdquo; problem is
          neither: it is the pinned action bar — Save stays on screen at every
          width, in every state, including all four groups open on the longest
          values.
        </p>

        <p className="text-caption mt-2 flex flex-wrap items-center gap-2">
          <span className="text-ink-muted">Width:</span>
          {WIDTH_KEYS.map((key) => (
            <Link
              key={key}
              href={`/shell/form/full?width=${key}${params.long === "1" ? "&long=1" : ""}`}
              className={
                key === width
                  ? "text-ink-main"
                  : "text-accent underline underline-offset-2"
              }
            >
              {DRAWER_WIDTHS[key].px}px
            </Link>
          ))}
          <span aria-hidden="true" className="text-ink-muted">
            ·
          </span>
          <span className="text-ink-muted">{DRAWER_WIDTHS[width].note}</span>
          <span aria-hidden="true" className="text-ink-muted">
            ·
          </span>
          <Link
            href={`/shell/form/full?width=${width}${params.long === "1" ? "" : "&long=1"}`}
            className="text-accent underline underline-offset-2"
          >
            {params.long === "1" ? "Ordinary values" : "Longest values"}
          </Link>
        </p>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden">
        <FullDrawerForm initial={initial} width={width} />
      </div>
    </main>
  );
}
