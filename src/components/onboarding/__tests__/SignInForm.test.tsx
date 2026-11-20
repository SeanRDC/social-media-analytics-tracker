import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SignInForm } from "@/components/onboarding/SignInForm";
import { safeNext } from "@/lib/auth-tabs";

const magicLink = vi.fn();
const social = vi.fn();
const emailSignIn = vi.fn();
vi.mock("@/lib/auth-client", () => ({
  authClient: { signIn: { magicLink: (...a: unknown[]) => magicLink(...a), social: (...a: unknown[]) => social(...a), email: (...a: unknown[]) => emailSignIn(...a) }, getSession: async () => ({ data: null }) },
}));
let search = new URLSearchParams();
vi.mock("next/navigation", () => ({ useSearchParams: () => search, useRouter: () => ({ push: vi.fn() }) }));

describe("safeNext", () => {
  it("keeps same-site paths and refuses anything that could leave the site", () => {
    expect(safeNext("/platforms?x=1")).toBe("/platforms?x=1");
    const bs = String.fromCharCode(92);
    const tab = String.fromCharCode(9);
    const nl = String.fromCharCode(10);
    const del = String.fromCharCode(127);
    for (const bad of [null, "", "https://evil.com", "//evil.com", `/${bs}evil.com`, `/${bs}/evil.com`, `/${tab}evil`, `/a${nl}b`, `/a${del}b`, "evil.com"]) {
      expect(safeNext(bad)).toBe("/overview");
    }
  });
});

describe("reviewer sign-in", () => {
  beforeEach(() => {
    emailSignIn.mockReset();
    search = new URLSearchParams();
  });

  it("is hidden unless reviewer sign-in is on", () => {
    render(<SignInForm providers={[]} />);
    expect(screen.queryByText("App reviewer sign-in")).not.toBeInTheDocument();
  });

  it("signs a reviewer in with email and password", async () => {
    emailSignIn.mockResolvedValue({ data: {}, error: null });
    render(<SignInForm providers={[]} reviewer />);
    fireEvent.click(screen.getByText("App reviewer sign-in"));
    fireEvent.change(screen.getByLabelText("Reviewer email"), { target: { value: "review@ispector.site" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "a-long-test-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in as reviewer" }));
    await waitFor(() => expect(emailSignIn).toHaveBeenCalledWith({ email: "review@ispector.site", password: "a-long-test-password", callbackURL: "/overview" }));
  });

  it("says when the details are wrong", async () => {
    emailSignIn.mockResolvedValue({ data: null, error: { status: 401, message: "Invalid email or password" } });
    render(<SignInForm providers={[]} reviewer />);
    fireEvent.change(screen.getByLabelText("Reviewer email"), { target: { value: "review@ispector.site" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "wrong-password-123" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in as reviewer" }));
    expect(await screen.findByText(/don't match a reviewer account/)).toBeInTheDocument();
  });
});

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
    expect(magicLink).toHaveBeenCalledWith({ email: "hello@northbay.studio", callbackURL: "/signed-in?next=%2Fplatforms", newUserCallbackURL: "/signed-in?next=%2Fwelcome" });
    expect(screen.getByText(/Check your spam or junk folder/)).toBeInTheDocument();
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
    expect(social).toHaveBeenCalledWith({ provider: "google", callbackURL: "/overview", newUserCallbackURL: "/welcome" });
    expect(screen.queryByRole("button", { name: /Apple/ })).not.toBeInTheDocument();
  });

  it("ignores redirect targets outside this site", async () => {
    search = new URLSearchParams("next=https://evil.example/steal");
    render(<SignInForm providers={[]} />);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "hello@northbay.studio" } });
    fireEvent.click(screen.getByRole("button", { name: "Email me a sign-in link" }));
    await waitFor(() => expect(magicLink).toHaveBeenCalled());
    expect(magicLink.mock.calls[0][0].callbackURL).toBe("/signed-in?next=%2Foverview");
  });
});
