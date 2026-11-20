import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { InstallApp } from "@/components/pwa/InstallApp";

afterEach(() => vi.restoreAllMocks());

const offer = (outcome: "accepted" | "dismissed") => {
  const e = new Event("beforeinstallprompt") as Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
  e.prompt = vi.fn(async () => {});
  e.userChoice = Promise.resolve({ outcome });
  return e;
};

describe("InstallApp", () => {
  it("stays hidden until the browser offers to install", () => {
    render(<InstallApp />);
    expect(screen.queryByRole("button", { name: "Install app" })).toBeNull();
  });

  it("opens the browser's install dialog, and disappears once installed", async () => {
    render(<InstallApp />);
    const e = offer("accepted");
    act(() => {
      window.dispatchEvent(e);
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Install app" }));
    });
    expect(e.prompt).toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Install app" })).toBeNull();
  });

  it("shows the Home Screen steps on iPhone, where Safari has no install dialog", async () => {
    document.documentElement.dataset.ios = "true";
    render(<InstallApp />);
    const button = await screen.findByRole("button", { name: "Install app" });
    fireEvent.click(button);
    expect(screen.getByRole("dialog", { name: "Add Ispector to your Home Screen" })).toHaveTextContent("Add to Home Screen");
    delete document.documentElement.dataset.ios;
  });
});
