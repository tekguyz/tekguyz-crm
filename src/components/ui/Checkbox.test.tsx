import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Checkbox } from "./Checkbox";

describe("Checkbox", () => {
  it("is a Level 0 control: hairline border, no shadow", () => {
    render(<Checkbox aria-label="Alerts" />);
    const box = screen.getByRole("checkbox", { name: "Alerts" });
    expect(box).toHaveClass("border-hairline", "size-4", "rounded-xs");
    expect(box.className).not.toMatch(/shadow-elevation/);
  });

  it("uses the accent pair when checked, never a hardcoded white", () => {
    render(<Checkbox aria-label="Alerts" defaultChecked />);
    const box = screen.getByRole("checkbox", { name: "Alerts" });
    expect(box).toHaveAttribute("data-state", "checked");
    expect(box.className).toContain("data-[state=checked]:bg-accent");
    expect(box.className).toContain("data-[state=checked]:text-accent-fg");
    expect(box.className).not.toMatch(/text-canvas-pure|text-white/);
  });

  it("toggles on click and reports its state", async () => {
    const user = userEvent.setup();
    render(<Checkbox label="New lead alerts" />);
    const box = screen.getByRole("checkbox", { name: "New lead alerts" });
    expect(box).toHaveAttribute("data-state", "unchecked");
    await user.click(box);
    expect(box).toHaveAttribute("data-state", "checked");
  });

  it("toggles from the keyboard", async () => {
    const user = userEvent.setup();
    render(<Checkbox label="New lead alerts" />);
    const box = screen.getByRole("checkbox", { name: "New lead alerts" });
    await user.tab();
    expect(box).toHaveFocus();
    await user.keyboard(" ");
    expect(box).toHaveAttribute("data-state", "checked");
  });

  it("wires the label to the box, so clicking the text toggles it", async () => {
    const user = userEvent.setup();
    render(<Checkbox label="Weekly revenue report" />);
    await user.click(screen.getByText("Weekly revenue report"));
    expect(screen.getByRole("checkbox")).toHaveAttribute("data-state", "checked");
  });

  it("does not toggle when disabled", async () => {
    const user = userEvent.setup();
    render(<Checkbox label="Alerts" disabled />);
    const box = screen.getByRole("checkbox", { name: "Alerts" });
    expect(box).toBeDisabled();
    await user.click(box);
    expect(box).toHaveAttribute("data-state", "unchecked");
  });

  // Form/Action Field Parity: the action reads
  // formData.get("notify_new_lead") === "on", so a hidden native checkbox
  // carrying that exact name has to reach the form.
  it("submits its name in FormData like a native checkbox", () => {
    const { container } = render(
      <form>
        <Checkbox name="notify_new_lead" defaultChecked label="New lead alerts" />
      </form>,
    );
    const form = container.querySelector("form")!;
    expect(new FormData(form).get("notify_new_lead")).toBe("on");
  });

  it("omits the name from FormData when unchecked", () => {
    const { container } = render(
      <form>
        <Checkbox name="notify_new_lead" label="New lead alerts" />
      </form>,
    );
    const form = container.querySelector("form")!;
    expect(new FormData(form).get("notify_new_lead")).toBeNull();
  });

  it("merges a caller className", () => {
    render(<Checkbox aria-label="Alerts" className="mt-0.5" />);
    expect(screen.getByRole("checkbox", { name: "Alerts" })).toHaveClass("mt-0.5");
  });
});
