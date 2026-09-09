import { notFound } from "next/navigation";

import { FakeContent } from "../preview/FakeContent";
import { PHONE_TAB_BAR_OVERRIDE } from "../preview/frames";
import {
  DesktopFrame,
  PhoneFrame,
  VariantPage,
} from "../preview/PreviewSurface";
import { SectionedHeader } from "./SectionedHeader";
import { SectionedSidebar } from "./SectionedSidebar";
import { SectionedTabBar } from "./SectionedTabBar";

const USER = { displayName: "Alejandro Ruiz", userEmail: "admin@tekguyz.com" };

export default function SectionedVariantPage() {
  // Repeated from the layout on purpose — see layout.tsx. A layout that
  // throws does not stop its page rendering, so this is the check that keeps
  // the comp markup out of the production build entirely.
  if (process.env.NODE_ENV !== "development") notFound();

  return (
    <VariantPage
      name="Variant A — Sectioned"
      thesis="Grouping with nothing attached to it. Static captions split seven destinations into two short lists plus a pinned footer pair; collapsed, the captions become hairline rules. The header loses 8px and the search trigger takes a field's silhouette. On the phone, the active tab gains an accent plate so the 2px marker is no longer carrying the signal alone."
    >
      <DesktopFrame label="Desktop — expanded rail, demo badge shown">
        <SectionedSidebar collapsed={false} activeHref="/pipeline" />
        <div className="flex min-w-0 flex-1 flex-col">
          <SectionedHeader {...USER} isDemo />
          <div className="flex-1 overflow-y-auto p-4">
            <FakeContent title="Pipeline" />
          </div>
        </div>
      </DesktopFrame>

      <DesktopFrame label="Desktop — collapsed rail, no demo badge">
        <SectionedSidebar collapsed activeHref="/" />
        <div className="flex min-w-0 flex-1 flex-col">
          <SectionedHeader {...USER} />
          <div className="flex-1 overflow-y-auto p-4">
            <FakeContent title="Today" />
          </div>
        </div>
      </DesktopFrame>

      <PhoneFrame label="Mobile — 375px, Pipeline active">
        <div className="h-full overflow-y-auto p-4 pb-24">
          <FakeContent title="Pipeline" />
        </div>
        <SectionedTabBar activeHref="/pipeline" className={PHONE_TAB_BAR_OVERRIDE} />
      </PhoneFrame>
    </VariantPage>
  );
}
