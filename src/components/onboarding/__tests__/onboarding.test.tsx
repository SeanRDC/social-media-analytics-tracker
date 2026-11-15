import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConnectFlow } from "@/components/onboarding/ConnectFlow";
import { SignInForm } from "@/components/onboarding/SignInForm";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace: vi.fn() }) }));

const PLATFORMS = [
  { id: "youtube", name: "YouTube", account: "", status: "not-connected" },
  { id: "instagram", name: "Instagram", account: "", status: "not-connected" },
] as const;

describe("SignInForm", () => {
  beforeEach(() => push.mockClear());

  it("explains an invalid email instead of continuing", () => {
    render(<SignInForm />);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "sean@" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue with email" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Enter an email like name@example.com");
    expect(push).not.toHaveBeenCalled();
  });

  it("continues to connecting accounts with a valid email", () => {
    render(<SignInForm />);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "hello@northbay.studio" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue with email" }));
    expect(push).toHaveBeenCalledWith("/onboarding/connect");
  });
});

describe("ConnectFlow", () => {
  beforeEach(() => {
    push.mockClear();
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it("keeps Continue disabled until one platform is connected", () => {
    render(<ConnectFlow platforms={[...PLATFORMS]} />);
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
    const yt = screen.getByRole("listitem", { name: "YouTube" });
    fireEvent.click(within(yt).getByRole("button", { name: "Connect YouTube" }));
    expect(within(yt).getByText("Waiting for YouTube…")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1300));
    expect(within(yt).getByText("Connected")).toBeInTheDocument();
    expect(screen.getByText("1 of 2 connected")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(push).toHaveBeenCalledWith("/onboarding/sync?p=youtube");
  });

  it("explains Instagram's professional account requirement and lets you retry", () => {
    render(<ConnectFlow platforms={[...PLATFORMS]} />);
    const ig = screen.getByRole("listitem", { name: "Instagram" });
    fireEvent.click(within(ig).getByRole("button", { name: "Connect Instagram" }));
    act(() => vi.advanceTimersByTime(1300));
    expect(within(ig).getByText(/Professional account/)).toBeInTheDocument();
    fireEvent.click(within(ig).getByRole("button", { name: "How to switch" }));
    expect(within(ig).getByText(/Switch to professional account/)).toBeInTheDocument();
    fireEvent.click(within(ig).getByRole("button", { name: "I've switched, try again" }));
    act(() => vi.advanceTimersByTime(1300));
    expect(within(ig).getByText("Connected")).toBeInTheDocument();
  });
});
