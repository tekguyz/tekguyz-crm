import { cn } from "@/lib/utils/cn";

// Every entry below carries a COMPLETE, LITERAL Tailwind class string. Never
// build one from a template literal (`bg-pill-${name}-bg`) — Tailwind's scanner
// reads source text, so an interpolated name generates no CSS at all and the
// swatch silently renders untinted. This rule holds for every section file.

const SURFACES = [
  { name: "canvas-soft", className: "bg-canvas-soft" },
  { name: "canvas-pure", className: "bg-canvas-pure" },
  { name: "hairline", className: "bg-hairline" },
  { name: "ink-muted", className: "bg-ink-muted" },
  { name: "ink-main", className: "bg-ink-main" },
  { name: "accent", className: "bg-accent" },
  { name: "danger", className: "bg-danger" },
  { name: "cold", className: "bg-cold" },
];

const PILLS = [
  { name: "purple", className: "bg-pill-purple-bg text-pill-purple-fg" },
  { name: "pink", className: "bg-pill-pink-bg text-pill-pink-fg" },
  { name: "orange", className: "bg-pill-orange-bg text-pill-orange-fg" },
  { name: "teal", className: "bg-pill-teal-bg text-pill-teal-fg" },
  { name: "green", className: "bg-pill-green-bg text-pill-green-fg" },
  { name: "sky", className: "bg-pill-sky-bg text-pill-sky-fg" },
];

const RADII = [
  { name: "rounded-xs", className: "rounded-xs" },
  { name: "rounded-sm", className: "rounded-sm" },
  { name: "rounded-md", className: "rounded-md" },
  { name: "rounded-lg", className: "rounded-lg" },
  { name: "rounded-xl", className: "rounded-xl" },
];

const TYPE_ROLES = [
  { name: "text-display", className: "text-display" },
  { name: "text-h1", className: "text-h1" },
  { name: "text-h2", className: "text-h2" },
  { name: "text-title", className: "text-title" },
  { name: "text-body-md", className: "text-body-md" },
  { name: "text-body-sm", className: "text-body-sm" },
  { name: "text-label", className: "text-label" },
  { name: "text-caption", className: "text-caption" },
];

export function TokensSection() {
  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-h2">Tokens</h3>

      <div className="flex flex-wrap gap-2">
        {SURFACES.map(({ name, className }) => (
          <div key={name} className="flex flex-col items-center gap-1">
            <div
              className={cn(
                "size-12 rounded-sm border border-hairline",
                className,
              )}
            />
            <span className="text-caption text-ink-muted">{name}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {PILLS.map(({ name, className }) => (
          <span
            key={name}
            className={cn("text-label rounded-sm px-1.5 py-0.5", className)}
          >
            {name}
          </span>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        {RADII.map(({ name, className }) => (
          <div key={name} className="flex flex-col items-center gap-1">
            <div
              className={cn(
                "size-12 border border-hairline bg-canvas-pure",
                className,
              )}
            />
            <span className="text-caption text-ink-muted">{name}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="text-caption rounded-lg bg-canvas-pure p-3">
          Level 0 — no shadow
        </div>
        <div className="text-caption rounded-lg bg-canvas-pure p-3 shadow-elevation-1">
          Level 1 — popovers
        </div>
        <div className="text-caption rounded-lg bg-canvas-pure p-3 shadow-elevation-2">
          Level 2 — modals
        </div>
      </div>

      <div className="flex flex-col gap-1">
        {TYPE_ROLES.map(({ name, className }) => (
          <p key={name} className={className}>
            {name} — The quick brown fox jumps over the lazy dog
          </p>
        ))}
      </div>
    </div>
  );
}
