import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AgreementForm } from "@/components/onboarding/AgreementForm";

// jsdom has no layout: give every element a panel 300px tall holding 1000px of text
let scrollHeight = 1000;
beforeEach(() => {
  scrollHeight = 1000;
  vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockImplementation(() => scrollHeight);
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockImplementation(() => 300);
});
afterEach(() => vi.restoreAllMocks());

const setup = () => {
  const onAgree = vi.fn(async (_prev: { error: string } | null, form: FormData) => (form.get("agree") === "on" ? null : { error: "no" }));
  render(<AgreementForm terms={<p>Terms body</p>} privacy={<p>Privacy body</p>} onAgree={onAgree} />);
  return { onAgree, user: userEvent.setup() };
};

/** Scrolls the visible document to its end. */
const scrollToEnd = (name: string) => {
  const panel = screen.getByRole("region", { name });
  panel.scrollTop = 700;
  fireEvent.scroll(panel);
};

const readBoth = async () => {
  scrollToEnd("Terms of Service");
  // reaching the end of the terms moves on to the privacy policy by itself
  await screen.findByRole("region", { name: "Privacy Policy" }, { timeout: 2000 });
  scrollToEnd("Privacy Policy");
};

describe("AgreementForm", () => {
  it("keeps the box locked until both documents are scrolled to the end", async () => {
    setup();
    const box = screen.getByRole("checkbox", { name: /agree to the Terms of Service and the Privacy Policy/ });
    expect(box).toBeDisabled();
    expect(screen.getByText(/Scroll to the end of the Terms of Service/)).toBeInTheDocument();

    // halfway down doesn't count
    const panel = screen.getByRole("region", { name: "Terms of Service" });
    panel.scrollTop = 200;
    fireEvent.scroll(panel);
    expect(box).toBeDisabled();

    scrollToEnd("Terms of Service");
    expect(await screen.findByText(/Now scroll to the end of the Privacy Policy/)).toBeInTheDocument();
    expect(screen.getByRole("checkbox")).toBeDisabled();
    expect(await screen.findByRole("region", { name: "Privacy Policy" }, { timeout: 2000 })).toHaveTextContent("Privacy body");

    scrollToEnd("Privacy Policy");
    await waitFor(() => expect(screen.getByRole("checkbox")).toBeEnabled());
    expect(screen.queryByText(/Scroll to the end/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Terms of Service ✓" })).toBeInTheDocument();
  });

  it("keeps Continue off until the box is ticked", async () => {
    const { user } = setup();
    await readBoth();
    const go = screen.getByRole("button", { name: "Agree and continue" });
    expect(go).toBeDisabled();
    await waitFor(() => expect(screen.getByRole("checkbox")).toBeEnabled());
    await user.click(screen.getByRole("checkbox"));
    expect(go).toBeEnabled();
    await user.click(screen.getByRole("checkbox"));
    expect(go).toBeDisabled();
  });

  it("counts a document that fits without scrolling as read", async () => {
    scrollHeight = 200;
    setup();
    await waitFor(() => expect(screen.getByRole("checkbox")).toBeEnabled(), { timeout: 3000 });
  });

  it("lets the person switch documents by hand at any time", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "Privacy Policy" }));
    expect(screen.getByRole("region", { name: "Privacy Policy" })).toHaveTextContent("Privacy body");
    await user.click(screen.getByRole("button", { name: "Terms of Service" }));
    expect(screen.getByRole("region", { name: "Terms of Service" })).toHaveTextContent("Terms body");
  });

  it("submits the ticked box to the server action", async () => {
    const { user, onAgree } = setup();
    await readBoth();
    await waitFor(() => expect(screen.getByRole("checkbox")).toBeEnabled());
    await user.click(screen.getByRole("checkbox"));
    await act(async () => {
      await user.click(screen.getByRole("button", { name: "Agree and continue" }));
    });
    await waitFor(() => expect(onAgree).toHaveBeenCalledTimes(1));
    expect((onAgree.mock.calls[0][1] as FormData).get("agree")).toBe("on");
  });

  it("links to both full documents in a new tab", () => {
    setup();
    expect(screen.getByRole("link", { name: /Terms of Service/ })).toHaveAttribute("href", "/terms");
    expect(screen.getByRole("link", { name: /Privacy Policy/ })).toHaveAttribute("target", "_blank");
  });
});
