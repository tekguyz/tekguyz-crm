import { Avatar } from "@/components/ui/Avatar";

// A spread of names chosen so the hash lands on more than one hue — the point
// of this panel is to prove the palette classes reached Tailwind's scanner and
// that the same name paints the same colour in both themes.
const NAMES = [
  "Ada Lovelace",
  "Grace Hopper",
  "Alan Turing",
  "Katherine Johnson",
  "Barbara Liskov",
  "Edsger Dijkstra",
  "Northwind Traders",
  "Contoso Ltd",
];

// The edges the initials logic has to survive.
const EDGE_CASES: { label: string; name: string }[] = [
  { label: "two words", name: "Ada Lovelace" },
  { label: "one word", name: "Northwind" },
  { label: "four words", name: "Ada Byron King Lovelace" },
  { label: "extra spaces", name: "  ada   lovelace  " },
  { label: "empty string", name: "" },
  { label: "whitespace only", name: "   " },
];

export function AvatarSection() {
  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-h2">Avatar</h3>
      <p className="text-body-sm text-ink-muted">
        Initials on a hash-selected decorative pill hue. Zero storage — no photo,
        no column. The same name always lands on the same colour.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        {NAMES.map((name) => (
          <Avatar key={name} name={name} />
        ))}
      </div>

      <h4 className="text-title">Sizes</h4>
      <div className="flex items-center gap-3">
        <Avatar name="Ada Lovelace" size="sm" />
        <Avatar name="Ada Lovelace" size="default" />
        <Avatar name="Ada Lovelace" size="lg" />
        <span className="text-caption text-ink-muted">sm / default / lg — one name, one hue</span>
      </div>

      <h4 className="text-title">Name inputs</h4>
      <div className="flex flex-col gap-2">
        {EDGE_CASES.map(({ label, name }) => (
          <div key={label} className="flex items-center gap-2">
            <Avatar name={name} size="sm" />
            <span className="text-body-sm">{label}</span>
            <code className="text-caption text-ink-muted">{JSON.stringify(name)}</code>
          </div>
        ))}
      </div>
    </div>
  );
}
