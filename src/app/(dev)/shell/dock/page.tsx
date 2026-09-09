import { notFound } from "next/navigation";

import { FakeContent } from "../preview/FakeContent";
import { PHONE_TAB_BAR_OVERRIDE } from "../preview/frames";
import {
  DesktopFrame,
  PhoneFrame,
  VariantPage,
} from "../preview/PreviewSurface";
import { DockHeader } from "./DockHeader";
import { DockSidebar } from "./DockSidebar";
import { DockTabBar } from "./DockTabBar";

const USER = { displayName: "Alejandro Ruiz", userEmail: "admin@tekguyz.com" };

export default function DockVariantPage() {
  // Repeated from the layout on purpose — see layout.tsx. A layout that
  // throws does not stop its page rendering, so this is the check that keeps
  // the comp markup out of the production build entirely.
  if (process.env.NODE_ENV !== "development") notFound();

  return (
    <VariantPage
      name="Variant C — Quiet"
      thesis="The quietest rail of the three: groups split by a full-bleed hairline with no captions at all, position doing the grouping. The collapse control moves to the panel's top edge, which empties a whole band out of the sidebar footer. The header carries the page title on the left and the reference's cluster on the right — Help, search, a seam, avatar. An earlier pass docked identity in the sidebar footer instead; it came back to the header because three stacked bands read busier than the header ever did. On the phone the bar lifts off the screen edge into an inset rounded card, so scrolling content passes under a layer rather than into a seam."
    >
      <DesktopFrame label="Desktop — expanded rail, edge chevron, identity top-right">
        <DockSidebar collapsed={false} activeHref="/contacts" />
        <div className="flex min-w-0 flex-1 flex-col">
          <DockHeader title="Contacts" {...USER} isDemo />
          <div className="flex-1 overflow-y-auto p-4">
            <FakeContent />
          </div>
        </div>
      </DesktopFrame>

      <DesktopFrame label="Desktop — collapsed rail beside the expanded one">
        <DockSidebar collapsed={false} activeHref="/reports" />
        <DockSidebar collapsed activeHref="/reports" />
        <div className="flex min-w-0 flex-1 flex-col">
          <DockHeader title="Reports" {...USER} />
          <div className="flex-1 overflow-y-auto p-4">
            <FakeContent />
          </div>
        </div>
      </DesktopFrame>

      <PhoneFrame label="Mobile — 375px, Today active, inset card">
        <div className="h-full overflow-y-auto p-4 pb-24">
          <FakeContent title="Today" />
        </div>
        <DockTabBar activeHref="/" className={PHONE_TAB_BAR_OVERRIDE} />
      </PhoneFrame>
    </VariantPage>
  );
}
