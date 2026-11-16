import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DeleteAccount } from "@/components/settings/DeleteAccount";

describe("DeleteAccount", () => {
  it("asks for the email before deleting and shows a mismatch", async () => {
    const onDelete = vi.fn(async () => ({ error: "That doesn't match the email you sign in with." }));
    render(<DeleteAccount email="a@example.com" onDelete={onDelete} />);
    await userEvent.click(screen.getByRole("button", { name: "Delete account" }));
    const submit = screen.getByRole("button", { name: "Delete everything" });
    expect(submit).toBeDisabled();
    await userEvent.type(screen.getByLabelText(/to confirm/), "wrong@example.com");
    await userEvent.click(submit);
    expect(onDelete).toHaveBeenCalledWith("wrong@example.com");
    expect(await screen.findByRole("alert")).toHaveTextContent("doesn't match");
  });

  it("can be cancelled", async () => {
    render(<DeleteAccount email="a@example.com" onDelete={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Delete account" }));
    await userEvent.click(screen.getByRole("button", { name: "Keep my account" }));
    expect(screen.getByRole("button", { name: "Delete account" })).toBeInTheDocument();
  });
});
