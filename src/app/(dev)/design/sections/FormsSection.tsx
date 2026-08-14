import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";

// Each field state gets its own instance rather than a loop over props, because
// the point of this page is to look at every state at once — a loop would hide
// which prop produced which rendering.
export function FormsSection() {
  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-h2">Input</h3>
      <div className="flex flex-col gap-3">
        <Input placeholder="No label" />
        <Input label="Company" placeholder="TEKGUYZ" />
        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          hint="We never share this."
        />
        <Input
          label="Email"
          type="email"
          defaultValue="not-an-email"
          error="Not a valid email address."
        />
        <Input label="Owner" defaultValue="Locked" disabled />
      </div>

      <h3 className="text-h2">Textarea</h3>
      <div className="flex flex-col gap-3">
        <Textarea placeholder="No label" rows={2} />
        <Textarea
          label="Notes"
          placeholder="Anything worth remembering"
          rows={2}
        />
        <Textarea
          label="Notes"
          rows={2}
          hint="Markdown is supported."
          placeholder="Anything worth remembering"
        />
        <Textarea
          label="Notes"
          rows={2}
          defaultValue="Far too much text for this field."
          error="Keep it under 240 characters."
        />
        <Textarea label="Notes" rows={2} defaultValue="Locked" disabled />
      </div>
    </div>
  );
}
