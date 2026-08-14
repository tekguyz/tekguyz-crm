// Shared placeholder-shape primitive for every loading.tsx in this app.
// Deliberately just a pulsing tinted block, not a full component — real
// container chrome always comes from the actual card/panel classes at each call
// site, so a skeleton's silhouette matches the real layout instead of one
// generic box repeated everywhere.
//
// Under Design System v2 that chrome is a hairline border and radius, not a
// shadow: Level 0 is now the default for cards, inputs, buttons and rows, so a
// skeleton standing in for one should read flat. Only a popover (Level 1) or a
// modal (Level 2) skeleton has any elevation to inherit.
//
// The classes need no v2 edit — rounded-xs and bg-hairline/70 are already
// token-based and both resolve to their v2 values automatically.
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xs bg-hairline/70 ${className}`} />;
}
