import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AgreementForm } from "@/components/onboarding/AgreementForm";

const setup = () => {
  const onAgree = vi.fn(async (_prev: { error: string } | null, form: FormData) => (form.get("agree") === "on" ? null : { error: "no" }));
  render(<AgreementForm terms={<p>Terms body</p>} privacy={<p>Privacy body</p>} onAgree={onAgree} />);
  return { onAgree, user: userEvent.setup() };
};

describe("AgreementForm", () => {
  it("keeps Continue off until the box is ticked", async () => {
    const { user } = setup();
    const go = screen.getByRole("button", { name: "Agree and continue" });
    expect(go).toBeDisabled();
    await user.click(screen.getByRole("checkbox", { name: /agree to the Terms of Service and the Privacy Policy/ }));
    expect(go).toBeEnabled();
    await user.click(screen.getByRole("checkbox"));
    expect(go).toBeDisabled();
  });

  it("shows the terms first and switches to the privacy policy", async () => {
    const { user } = setup();
    expect(screen.getByRole("region", { name: "Terms of Service" })).toHaveTextContent("Terms body");
    await user.click(screen.getByRole("button", { name: "Privacy Policy" }));
    expect(screen.getByRole("region", { name: "Privacy Policy" })).toHaveTextContent("Privacy body");
  });

  it("submits the ticked box to the server action", async () => {
    const { user, onAgree } = setup();
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Agree and continue" }));
    await waitFor(() => expect(onAgree).toHaveBeenCalledTimes(1));
    expect((onAgree.mock.calls[0][1] as FormData).get("agree")).toBe("on");
  });

  it("links to both full documents in a new tab", () => {
    setup();
    expect(screen.getByRole("link", { name: /Terms of Service/ })).toHaveAttribute("href", "/terms");
    expect(screen.getByRole("link", { name: /Privacy Policy/ })).toHaveAttribute("target", "_blank");
  });
});
