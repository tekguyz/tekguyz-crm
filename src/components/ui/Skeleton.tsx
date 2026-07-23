// Shared placeholder-shape primitive for every loading.tsx in this app.
// Deliberately just a pulsing tinted block, not a full component — real
// container chrome (border, radius, shadow-elevation) always comes from the
// actual card/panel classes at each call site, so a skeleton's silhouette
// matches the real layout instead of one generic box repeated everywhere.
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xs bg-hairline/70 ${className}`} />;
}
