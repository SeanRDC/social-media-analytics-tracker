import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProfileName } from "@/components/settings/ProfileName";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

describe("ProfileName", () => {
  it("saves a new name and goes back to showing it", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<ProfileName name="delacruz" onSave={onSave} />);
    fireEvent.click(screen.getByRole("button", { name: "Edit name" }));
    fireEvent.change(screen.getByLabelText("Your name"), { target: { value: "Sean Dela Cruz" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith("Sean Dela Cruz"));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(screen.getByRole("button", { name: "Edit name" })).toBeInTheDocument();
  });

  it("shows why a name was refused and keeps editing", async () => {
    render(<ProfileName name="delacruz" onSave={vi.fn().mockResolvedValue({ error: "Enter a name." })} />);
    fireEvent.click(screen.getByRole("button", { name: "Edit name" }));
    fireEvent.change(screen.getByLabelText("Your name"), { target: { value: "  " } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Enter a name.");
    expect(screen.getByLabelText("Your name")).toBeInTheDocument();
  });

  it("cancels without saving", () => {
    const onSave = vi.fn();
    render(<ProfileName name="delacruz" onSave={onSave} />);
    fireEvent.click(screen.getByRole("button", { name: "Edit name" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText("delacruz")).toBeInTheDocument();
  });
});
