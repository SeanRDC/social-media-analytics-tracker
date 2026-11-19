import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Select } from "@/components/ui/Select";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map((label, i) => ({ value: i + 1, label }));

const setup = (props: Partial<Parameters<typeof Select<number>>[0]> = {}) => {
  const onChange = vi.fn();
  render(<Select label="Send on" value={1} options={DAYS} onChange={onChange} {...props} />);
  return { onChange, user: userEvent.setup(), button: screen.getByRole("button", { name: "Send on: Monday" }) };
};

describe("Select", () => {
  it("is a styled list, not the browser's native dropdown", () => {
    setup();
    expect(screen.queryByRole("combobox")).toBeNull();
    expect(document.querySelector("select")).toBeNull();
  });

  it("opens on click, marks the current value and chooses another", async () => {
    const { user, button, onChange } = setup();
    await user.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("option", { name: "Monday" })).toHaveAttribute("aria-selected", "true");
    await user.click(screen.getByRole("option", { name: "Thursday" }));
    expect(onChange).toHaveBeenCalledWith(4);
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(button).toHaveFocus();
  });

  it("works from the keyboard: arrows, Home/End, Enter and type-ahead", async () => {
    const { user, button, onChange } = setup();
    button.focus();
    await user.keyboard("{ArrowDown}");
    const list = screen.getByRole("listbox", { name: "Send on" });
    expect(list).toHaveFocus();
    await user.keyboard("{ArrowDown}{ArrowDown}");
    expect(list).toHaveAttribute("aria-activedescendant", screen.getByRole("option", { name: "Wednesday" }).id);
    await user.keyboard("{End}");
    expect(list).toHaveAttribute("aria-activedescendant", screen.getByRole("option", { name: "Friday" }).id);
    await user.keyboard("{Home}t");
    expect(list).toHaveAttribute("aria-activedescendant", screen.getByRole("option", { name: "Tuesday" }).id);
    await user.keyboard("{Enter}");
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it("closes on Escape and on an outside click without changing anything", async () => {
    const { user, button, onChange } = setup();
    await user.click(button);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(button).toHaveFocus();
    await user.click(button);
    await user.click(document.body);
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("does not open when disabled", async () => {
    const { user, button } = setup({ disabled: true });
    expect(button).toBeDisabled();
    await user.click(button);
    expect(screen.queryByRole("listbox")).toBeNull();
  });
});

describe("Select placement", () => {
  it("opens its list at the top level of the page, so cards can't cover it", async () => {
    const { user, button } = setup();
    const { container } = render(<div className="card" />);
    await user.click(button);
    const list = screen.getByRole("listbox");
    expect(list.parentElement).toBe(document.body);
    expect(container.contains(list)).toBe(false);
    expect(list.style.position).toBe("fixed");
  });

  it("chooses an option inside the top-level list without treating it as an outside click", async () => {
    const { user, button, onChange } = setup();
    await user.click(button);
    await user.click(screen.getByRole("option", { name: "Wednesday" }));
    expect(onChange).toHaveBeenCalledWith(3);
  });
});
