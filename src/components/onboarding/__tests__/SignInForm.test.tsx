import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SignInForm } from "@/components/onboarding/SignInForm";

const magicLink = vi.fn();
const social = vi.fn();
vi.mock("@/lib/auth-client", () => ({
  authClient: { signIn: { magicLink: (...a: unknown[]) => magicLink(...a), social: (...a: unknown[]) => social(...a) } },
}));
let search = new URLSearchParams();
vi.mock("next/navigation", () => ({ useSearchParams: () => search, useRouter: () => ({ push: vi.fn() }) }));

describe("SignInForm", () => {
  beforeEach(() => {
    magicLink.mockReset().mockResolvedValue({ data: { status: true }, error: null });
    social.mockReset().mockResolvedValue({ data: null, error: null });
    search = new URLSearchParams();
  });

  it("explains an invalid email instead of sending a link", () => {
    render(<SignInForm providers={[]} />);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "sean@" } });
    fireEvent.click(screen.getByRole("button", { name: "Email me a sign-in link" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Enter an email like name@example.com");
    expect(magicLink).not.toHaveBeenCalled();
  });

  it("sends a magic link and asks the person to check their email", async () => {
    search = new URLSearchParams("next=/platforms");
    render(<SignInForm providers={[]} />);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "hello@northbay.studio" } });
    fireEvent.click(screen.getByRole("button", { name: "Email me a sign-in link" }));
    await waitFor(() => expect(screen.getByRole("heading", { name: "Check your email" })).toBeInTheDocument());
    expect(magicLink).toHaveBeenCalledWith({ email: "hello@northbay.studio", callbackURL: "/platforms", newUserCallbackURL: "/onboarding/connect" });
    expect(screen.getByText("hello@northbay.studio")).toBeInTheDocument();
  });

  it("shows the server's error when the link can't be sent", async () => {
    magicLink.mockResolvedValue({ data: null, error: { message: "Too many requests" } });
    render(<SignInForm providers={[]} />);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "hello@northbay.studio" } });
    fireEvent.click(screen.getByRole("button", { name: "Email me a sign-in link" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Too many requests"));
  });

  it("only offers Google and Apple when they are configured", () => {
    const { rerender } = render(<SignInForm providers={[]} />);
    expect(screen.queryByRole("button", { name: /Google/ })).not.toBeInTheDocument();
    rerender(<SignInForm providers={["google"]} />);
    fireEvent.click(screen.getByRole("button", { name: "Continue with Google" }));
    expect(social).toHaveBeenCalledWith({ provider: "google", callbackURL: "/overview", newUserCallbackURL: "/onboarding/connect" });
    expect(screen.queryByRole("button", { name: /Apple/ })).not.toBeInTheDocument();
  });

  it("ignores redirect targets outside this site", async () => {
    search = new URLSearchParams("next=https://evil.example/steal");
    render(<SignInForm providers={[]} />);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "hello@northbay.studio" } });
    fireEvent.click(screen.getByRole("button", { name: "Email me a sign-in link" }));
    await waitFor(() => expect(magicLink).toHaveBeenCalled());
    expect(magicLink.mock.calls[0][0].callbackURL).toBe("/overview");
  });
});
