import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SyncProgress } from "@/components/onboarding/SyncProgress";

let query = "p=youtube,tiktok";
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(query) }));

describe("SyncProgress", () => {
  it("imports each platform once and reports how it went", async () => {
    query = "p=youtube,tiktok";
    const onImport = vi.fn(async (id: string) => (id === "youtube" ? ("imported" as const) : ("not-yet" as const)));
    render(<SyncProgress onImport={onImport} />);
    expect(screen.getByText("Importing…")).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: /Open dashboard/ })).toHaveAttribute("href", "/overview");
    expect(onImport.mock.calls.map((c) => c[0])).toEqual(["youtube", "tiktok"]);
    expect(within(screen.getByRole("listitem", { name: "YouTube" })).getByText("History imported")).toBeInTheDocument();
    expect(within(screen.getByRole("listitem", { name: "TikTok" })).getByText(/coming update/)).toBeInTheDocument();
  });

  it("treats a crashed import as failed instead of hanging", async () => {
    query = "p=youtube";
    render(<SyncProgress onImport={vi.fn(async () => Promise.reject(new Error("network")))} />);
    expect(await screen.findByText(/try again in tonight's sync/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Open dashboard/ })).toBeInTheDocument();
  });

  it("ignores unknown platforms in the address", () => {
    query = "p=myspace";
    const onImport = vi.fn();
    render(<SyncProgress onImport={onImport} />);
    expect(onImport).not.toHaveBeenCalled();
    expect(screen.getByText("Nothing to import yet.")).toBeInTheDocument();
  });
});
