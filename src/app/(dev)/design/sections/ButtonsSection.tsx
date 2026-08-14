import { Button } from "@/components/ui/Button";

const VARIANTS = [
  { name: "primary", variant: "primary" as const },
  { name: "secondary", variant: "secondary" as const },
  { name: "ghost", variant: "ghost" as const },
  { name: "danger", variant: "danger" as const },
];

export function ButtonsSection() {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-h2">Button</h3>
      {VARIANTS.map(({ name, variant }) => (
        <div key={name} className="flex flex-wrap items-center gap-2">
          <span className="text-label w-20 text-ink-muted">{name}</span>
          <Button variant={variant} size="sm">
            Small
          </Button>
          <Button variant={variant}>Default</Button>
          <Button variant={variant} disabled>
            Disabled
          </Button>
          <Button variant={variant} loading>
            Loading
          </Button>
        </div>
      ))}
    </div>
  );
}
